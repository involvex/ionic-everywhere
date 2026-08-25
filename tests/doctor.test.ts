import {describe, expect, it} from 'vitest'
import {
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
	})
})
