import {describe, expect, it} from 'vitest'
import {validateNewOptions} from '../packages/ionic-everywhere/src/new'

const base = {
	install: true,
	android: true,
	electron: true,
	git: true,
	yes: false,
}

describe('validateNewOptions', () => {
	it('accepts fully valid options', () => {
		expect(
			validateNewOptions({
				...base,
				pm: 'bun',
				appId: 'com.example.myapp',
				appName: 'My App',
			}),
		).toEqual([])
	})

	it('accepts undefined optional fields', () => {
		expect(validateNewOptions({...base})).toEqual([])
	})

	it('rejects unsupported package managers fatally', () => {
		for (const pm of ['bun && echo pwned', 'npm; rm -rf /', 'deno', '']) {
			const findings = validateNewOptions({...base, pm})
			expect(findings).toHaveLength(1)
			expect(findings[0]).toMatchObject({field: 'pm', fatal: true})
			expect(findings[0].message).toContain('bun, npm, pnpm, yarn')
		}
	})

	it('rejects invalid appId fatally under --yes', () => {
		const findings = validateNewOptions({
			...base,
			yes: true,
			appId: 'not-valid',
		})
		expect(findings).toHaveLength(1)
		expect(findings[0]).toMatchObject({field: 'appId', fatal: true})
	})

	it('downgrades invalid appId to a warning interactively', () => {
		const findings = validateNewOptions({...base, appId: 'Not.Valid.ID'})
		expect(findings).toHaveLength(1)
		expect(findings[0]).toMatchObject({field: 'appId', fatal: false})
		expect(findings[0].message).toContain('prompted instead')
	})

	it('rejects XML-unsafe appName fatally under --yes', () => {
		for (const name of ['A&B', 'App<X>', 'Say "Hi"', "O'Brien", 'C:\\x']) {
			const findings = validateNewOptions({...base, yes: true, appName: name})
			expect(findings).toHaveLength(1)
			expect(findings[0]).toMatchObject({field: 'appName', fatal: true})
		}
	})

	it('rejects line breaks and control characters in appName (R-1)', () => {
		for (const name of ['A\nB', 'A\rB', 'A\tB', 'A\x1b[31mB']) {
			const findings = validateNewOptions({...base, yes: true, appName: name})
			expect(findings).toHaveLength(1)
			expect(findings[0]).toMatchObject({field: 'appName', fatal: true})
			expect(findings[0].message).toContain('line breaks or control')
		}
		const interactive = validateNewOptions({
			...base,
			appName: 'multi\nline',
		})
		expect(interactive[0]).toMatchObject({field: 'appName', fatal: false})
	})

	it('downgrades XML-unsafe appName to a warning interactively', () => {
		const findings = validateNewOptions({...base, appName: 'A & B'})
		expect(findings).toHaveLength(1)
		expect(findings[0]).toMatchObject({field: 'appName', fatal: false})
	})

	it('collects multiple findings at once', () => {
		const findings = validateNewOptions({
			...base,
			pm: 'deno',
			appId: 'bad',
			appName: '<x>',
		})
		expect(findings.map(f => f.field).sort()).toEqual([
			'appId',
			'appName',
			'pm',
		])
		expect(findings.find(f => f.field === 'pm')?.fatal).toBe(true)
	})
})
