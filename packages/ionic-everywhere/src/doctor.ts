import {spawnSync} from 'node:child_process'
import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import {platformDirsPresent} from './list'
import {commandExists} from './util'

export interface CheckResult {
	name: string
	ok: boolean
	required: boolean
	detail: string
	hint?: string
}

export interface CheckInputs {
	version?: string
	env?: NodeJS.ProcessEnv
	probe?: (cmd: string) => boolean
	javaProbe?: (javaExe: string) => number | null
	bunVersionProbe?: () => string | null
	projectRoot?: string
}

const PROJECT_MARKERS = ['capacitor.config.ts', 'package.json']

// Environment probes must never hang the CLI: a stalled java.exe or a
// path lookup wedged on AV/indexer load should read as "not available".
const PROBE_TIMEOUT_MS = 3_000

export function nodeMajor(version?: string): number | null {
	const m = /^v(\d+)\./.exec(version ?? '')
	return m ? Number(m[1]) : null
}

export function bunVersion(): string | null {
	try {
		const out = spawnSync('bun', ['--version'], {
			encoding: 'utf8',
			timeout: PROBE_TIMEOUT_MS,
		})
		if (out.error || out.status !== 0) return null
		const text = (out.stdout ?? '').trim()
		return text.length > 0 ? text : null
	} catch {
		return null
	}
}

/**
 * Semver prerelease detection for tool versions: anything with a hyphen
 * suffix ("1.4.0-canary.1", "1.3.0-beta.5") is not a stable release.
 */
export function isPrereleaseVersion(version: string): boolean {
	return /-/.test(version.replace(/^v/, '').trim())
}

export function javaVersion(javaExe: string): number | null {
	try {
		const out = spawnSync(javaExe, ['-version'], {
			encoding: 'utf8',
			timeout: PROBE_TIMEOUT_MS,
		})
		if (out.error) return null
		const text = `${out.stderr ?? ''}${out.stdout ?? ''}`
		const m = /(?:openjdk|java)\s+version\s+"(\d+)/i.exec(text)
		return m ? Number(m[1]) : null
	} catch {
		return null
	}
}

function resolveJava(
	env: NodeJS.ProcessEnv,
	javaProbe: (javaExe: string) => number | null,
): {version: number | null; source: string} {
	const exeName = process.platform === 'win32' ? 'java.exe' : 'java'
	const candidates: {label: string; exe: string; needsExists: boolean}[] = []
	const javaHome = env.JAVA_HOME
	if (javaHome)
		candidates.push({
			label: 'JAVA_HOME',
			exe: join(javaHome, 'bin', exeName),
			needsExists: true,
		})
	candidates.push({label: 'PATH', exe: 'java', needsExists: false})
	for (const candidate of candidates) {
		if (candidate.needsExists && !existsSync(candidate.exe)) continue
		const version = javaProbe(candidate.exe)
		if (version !== null) return {version, source: candidate.label}
	}
	return {version: null, source: ''}
}

export function allRequiredOk(checks: CheckResult[]): boolean {
	return checks.every(c => !c.required || c.ok)
}

export function runChecks(inputs: CheckInputs = {}): CheckResult[] {
	const version = inputs.version ?? process.version
	const env = inputs.env ?? process.env
	const probe = inputs.probe ?? commandExists
	const javaProbe = inputs.javaProbe ?? javaVersion
	const results: CheckResult[] = []

	const nm = nodeMajor(version)
	results.push({
		name: 'Node.js >= 20',
		ok: nm !== null && nm >= 20,
		required: true,
		detail: version,
		hint:
			nm !== null && nm < 20
				? 'https://nodejs.org - upgrade to Node 20 or newer'
				: undefined,
	})

	const hasBun = probe('bun')
	const hasNpm = probe('npm')
	results.push({
		name: 'Package manager',
		ok: hasBun || hasNpm,
		required: true,
		detail: hasBun ? 'bun available' : hasNpm ? 'npm available' : 'none found',
		hint:
			hasBun || hasNpm
				? undefined
				: 'Install bun (https://bun.sh) or ensure npm is on PATH',
	})

	if (hasBun) {
		const bunVer = inputs.bunVersionProbe
			? inputs.bunVersionProbe()
			: bunVersion()
		const unstable = bunVer !== null && isPrereleaseVersion(bunVer)
		results.push({
			name: 'bun release channel (installs)',
			ok: !unstable,
			required: false,
			detail:
				bunVer === null
					? 'bun available (version unknown)'
					: unstable
						? `prerelease build ${bunVer}`
						: `stable ${bunVer}`,
			hint: unstable
				? `Prerelease bun builds have produced broken installs (dropped native optional dependencies, missing transitive packages). Switch to a stable release such as 1.4.x: https://bun.sh`
				: undefined,
		})
	}

	const hasGit = probe('git')
	results.push({
		name: 'git',
		ok: hasGit,
		required: false,
		detail: hasGit ? 'available' : 'not found (skipping git init)',
	})

	const java = resolveJava(env, javaProbe)
	const tooNewForGradle = java.version !== null && java.version >= 24
	results.push({
		name: 'JDK >= 21 (Android builds)',
		ok: java.version !== null && java.version >= 21,
		required: false,
		detail:
			java.version !== null
				? `${java.source} provides Java ${java.version}`
				: env.JAVA_HOME
					? 'JAVA_HOME set but no usable java found (PATH also probed)'
					: 'no JDK found (set JAVA_HOME or put java on PATH)',
		hint:
			java.version !== null && java.version >= 21
				? tooNewForGradle
					? `Java ${java.version} is newer than what Capacitor's bundled Gradle reliably supports ("Unsupported class file major version" failures). Prefer a JDK from the 21-23 line.`
					: undefined
				: 'Capacitor 8 requires JDK 21+: https://learn.microsoft.com/en-us/java/openjdk/download',
	})

	const androidHome =
		env.ANDROID_HOME ?? join(env.LOCALAPPDATA ?? '', 'Android', 'Sdk')
	const hasSdkDir =
		androidHome !== join('', 'Android', 'Sdk') && existsSync(androidHome)
	const adbName = process.platform === 'win32' ? 'adb.exe' : 'adb'
	const adbPath = join(androidHome, 'platform-tools', adbName)
	const hasAdb = hasSdkDir && existsSync(adbPath)
	results.push({
		name: 'Android SDK (Android builds)',
		ok: hasAdb,
		required: false,
		detail: !hasSdkDir
			? 'ANDROID_HOME not set'
			: hasAdb
				? androidHome
				: `${androidHome} (missing platform-tools/${adbName})`,
		hint: hasAdb
			? undefined
			: hasSdkDir
				? 'SDK directory exists but is incomplete - install platform-tools via Android Studio or sdkmanager'
				: 'Install Android Studio or command-line tools, then set ANDROID_HOME',
	})

	if (inputs.projectRoot) {
		const projectResults = runProjectAwareChecks(inputs.projectRoot)
		results.push(...projectResults)
	}

	return results
}

function isProjectRoot(dir: string): boolean {
	return PROJECT_MARKERS.every(m => existsSync(join(dir, m)))
}

function readPkg(root: string): Record<string, unknown> {
	return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
}

export function runProjectAwareChecks(root: string): CheckResult[] {
	const results: CheckResult[] = []
	if (!isProjectRoot(root)) return results

	const pkg = readPkg(root)
	const deps = {
		...((pkg.dependencies as Record<string, string> | undefined) ?? {}),
		...((pkg.devDependencies as Record<string, string> | undefined) ?? {}),
	}
	const keyDeps = [
		'@capacitor/core',
		'@capacitor/cli',
		'@capacitor/android',
		'@capawesome/capacitor-electron',
		'@ionic/react',
		'@ionic/react-router',
		'react-router',
		'react-router-dom',
		'vite-plugin-pwa',
		'workbox-window',
		'typescript',
	]
	const versions: string[] = []
	for (const dep of keyDeps) {
		const ver = deps[dep]
		if (ver) versions.push(`${dep}@${ver}`)
	}
	if (versions.length > 0) {
		results.push({
			name: 'Project key dependencies',
			ok: true,
			required: false,
			detail: versions.join(', '),
		})
	}

	const dirs = platformDirsPresent(root)
	const allPlatforms = ['android', 'electron']
	const present = allPlatforms.filter(d => dirs.includes(d))
	const missing = allPlatforms.filter(d => !dirs.includes(d))
	if (present.length > 0 || missing.length > 0) {
		results.push({
			name: 'Platform directories',
			ok: missing.length === 0,
			required: false,
			detail:
				missing.length === 0
					? present.join(', ')
					: `missing: ${missing.join(', ')} (present: ${present.join(', ')})`,
			hint:
				missing.length > 0
					? 'Run ionic-everywhere add <android|desktop>'
					: undefined,
		})
	}

	const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {}
	const expected =
		present.length === 2
			? [
					'sync',
					'build:all',
					'build:android',
					'build:desktop',
					'preandroid',
					'predesktop',
					'android',
					'desktop',
					'desktop:dev',
					'open:android',
				]
			: present.includes('android')
				? ['sync', 'build:android', 'preandroid', 'android', 'open:android']
				: present.includes('electron')
					? ['sync', 'build:desktop', 'predesktop', 'desktop', 'desktop:dev']
					: []
	const missingScripts = expected.filter(s => !scripts[s])
	if (missingScripts.length > 0 && expected.length > 0) {
		results.push({
			name: 'Script drift (canonical registry)',
			ok: false,
			required: false,
			detail: `missing scripts: ${missingScripts.join(', ')}`,
			hint: 'Run ionic-everywhere upgrade to restore canonical scripts',
		})
	}

	return results
}

export function formatReport(checks: CheckResult[]): string {
	const lines: string[] = []
	for (const c of checks) {
		const mark = c.ok ? '[ok]' : c.required ? '[FAIL]' : '[warn]'
		lines.push(`${mark} ${c.name} - ${c.detail}`)
		if (!c.ok && c.hint) lines.push(`       fix: ${c.hint}`)
	}
	return lines.join('\n')
}
