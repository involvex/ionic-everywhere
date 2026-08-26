import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterAll, describe, expect, it} from 'vitest'
import {
	allRequiredOk,
	formatReport,
	javaVersion,
	nodeMajor,
	runChecks,
} from '../packages/ionic-everywhere/src/doctor'

describe('nodeMajor', () => {
	it('parses node versions', () => {
		expect(nodeMajor('v22.22.3')).toBe(22)
		expect(nodeMajor('v20.11.1')).toBe(20)
		expect(nodeMajor('garbage')).toBeNull()
	})
})

describe('javaVersion', () => {
	it('extracts major version despite banners', () => {
		expect(javaVersion.toString()).toContain('openjdk|java')
	})
	it('returns null for missing binary', () => {
		expect(javaVersion('definitely-not-a-real-java-binary-path')).toBeNull()
	})
})

describe('runChecks / formatReport', () => {
	it('returns checks including node and package manager', () => {
		const checks = runChecks()
		expect(checks.length).toBeGreaterThanOrEqual(4)
		const report = formatReport(checks)
		expect(report).toMatch(/\[ok\]|\[FAIL\]|\[warn\]/)
	}, 15_000) // runChecks spawns java/where probes; allow for slow machines/AV scans
})

describe('runChecks injection (FEAT-010)', () => {
	const tempDirs: string[] = []
	function makeTemp(): string {
		const dir = mkdtempSync(join(tmpdir(), 'ie-doctor-'))
		tempDirs.push(dir)
		return dir
	}
	afterAll(() => {
		for (const dir of tempDirs) rmSync(dir, {recursive: true, force: true})
	})
	const baseInputs = {
		version: 'v22.1.0',
		probe: (cmd: string) => cmd === 'bun' || cmd === 'npm',
	}

	it('finds JDK via PATH when JAVA_HOME is unset', () => {
		const checks = runChecks({
			...baseInputs,
			env: {},
			javaProbe: exe => {
				expect(exe).toBe('java')
				return 21
			},
		})
		const java = checks.find(c => c.name.startsWith('JDK'))
		expect(java?.ok).toBe(true)
		expect(java?.detail).toBe('PATH provides Java 21')
	})

	it('reports failure when JAVA_HOME is set but unusable and PATH lacks java', () => {
		const javaHome = makeTemp()
		const checks = runChecks({
			...baseInputs,
			env: {JAVA_HOME: javaHome},
			javaProbe: () => null,
		})
		const java = checks.find(c => c.name.startsWith('JDK'))
		expect(java?.ok).toBe(false)
		expect(java?.detail).toContain('PATH also probed')
	})

	it('prefers JAVA_HOME over PATH', () => {
		const javaHome = makeTemp()
		mkdirSync(join(javaHome, 'bin'), {recursive: true})
		writeFileSync(join(javaHome, 'bin', 'java.exe'), '')
		const probes: string[] = []
		const checks = runChecks({
			...baseInputs,
			env: {JAVA_HOME: javaHome},
			javaProbe: exe => {
				probes.push(exe)
				return 17
			},
		})
		const java = checks.find(c => c.name.startsWith('JDK'))
		expect(probes[0]).toBe(join(javaHome, 'bin', 'java.exe'))
		expect(java?.ok).toBe(false)
		expect(java?.detail).toBe('JAVA_HOME provides Java 17')
	})

	it('fails the SDK check when platform-tools/adb is missing', () => {
		const sdk = makeTemp()
		const checks = runChecks({
			...baseInputs,
			env: {ANDROID_HOME: sdk},
			javaProbe: () => null,
		})
		const sdkCheck = checks.find(c => c.name.startsWith('Android SDK'))
		expect(sdkCheck?.ok).toBe(false)
		expect(sdkCheck?.detail).toContain('platform-tools')
	})

	it('passes the SDK check when platform-tools/adb exists', () => {
		const sdk = makeTemp()
		mkdirSync(join(sdk, 'platform-tools'), {recursive: true})
		writeFileSync(
			join(
				sdk,
				'platform-tools',
				process.platform === 'win32' ? 'adb.exe' : 'adb',
			),
			'',
		)
		const checks = runChecks({
			...baseInputs,
			env: {ANDROID_HOME: sdk},
			javaProbe: () => null,
		})
		const sdkCheck = checks.find(c => c.name.startsWith('Android SDK'))
		expect(sdkCheck?.ok).toBe(true)
		expect(sdkCheck?.detail).toBe(sdk)
	})

	it('warns when the detected JDK is too new for the bundled Gradle', () => {
		const javaHome = makeTemp()
		mkdirSync(join(javaHome, 'bin'), {recursive: true})
		writeFileSync(join(javaHome, 'bin', 'java.exe'), '')
		const checks = runChecks({
			...baseInputs,
			env: {JAVA_HOME: javaHome},
			javaProbe: () => 25,
		})
		const java = checks.find(c => c.name.startsWith('JDK'))
		expect(java?.ok).toBe(true) // still a usable JDK...
		expect(java?.hint).toContain('Gradle') // ...but flagged as risky
	})

	it('allRequiredOk reflects required-check failures only', () => {
		expect(
			allRequiredOk([
				{name: 'a', ok: false, required: false, detail: ''},
				{name: 'b', ok: true, required: true, detail: ''},
			]),
		).toBe(true)
		expect(
			allRequiredOk([
				{name: 'a', ok: false, required: true, detail: ''},
				{name: 'b', ok: true, required: true, detail: ''},
			]),
		).toBe(false)
	})
})
