import {describe, expect, it} from 'vitest'
import {
	BLESSED_DEPS,
	readTemplateDeps,
} from '../packages/ionic-everywhere/src/cap-versions'
import {
	classifyDepChange,
	planDepChanges,
} from '../packages/ionic-everywhere/src/upgrade'

describe('BLESSED_DEPS drift-guard (registry vs template)', () => {
	it('has every blessed dep present in the template package.json', () => {
		const template = readTemplateDeps()
		for (const [pkg, version] of Object.entries(BLESSED_DEPS)) {
			expect(template[pkg]).toBe(version)
		}
	})

	it('has no extra deps in the template that are not blessed (ignoring scoped non-@capacitor)', () => {
		const template = readTemplateDeps()
		const blessed = new Set(Object.keys(BLESSED_DEPS))
		for (const pkg of Object.keys(template)) {
			if (pkg.startsWith('@capacitor/') || pkg === 'typescript')
				expect(blessed.has(pkg)).toBe(true)
		}
	})
})

describe('classifyDepChange', () => {
	it('returns new for missing packages', () => {
		expect(classifyDepChange(null, '^1.0.0')).toBe('new')
	})

	it('returns up-to-date when versions match', () => {
		expect(classifyDepChange('^8.5.1', '^8.5.1')).toBe('up-to-date')
	})

	it('returns patch for patch bumps', () => {
		expect(classifyDepChange('^8.5.0', '^8.5.1')).toBe('patch')
	})

	it('returns minor for minor bumps', () => {
		expect(classifyDepChange('^8.5.0', '^8.6.0')).toBe('minor')
	})

	it('returns major for major bumps', () => {
		expect(classifyDepChange('^8.5.1', '^9.0.0')).toBe('major')
	})

	it('treats v-prefixed versions the same', () => {
		expect(classifyDepChange('v8.5.0', 'v8.5.1')).toBe('patch')
	})
})

describe('planDepChanges', () => {
	it('is empty when all deps match', () => {
		const deps: Record<string, string> = {}
		for (const [pkg, version] of Object.entries(BLESSED_DEPS)) {
			deps[pkg] = version
		}
		const pkg = {
			dependencies: {...deps},
			devDependencies: {},
		}
		const {appliable, advisory} = planDepChanges(pkg as Record<string, unknown>)
		expect(appliable).toHaveLength(0)
		expect(advisory).toHaveLength(0)
	})

	it('flags missing packages as new (appliable)', () => {
		const pkg = {
			dependencies: {},
			devDependencies: {},
		}
		const {appliable, advisory} = planDepChanges(pkg as Record<string, unknown>)
		expect(appliable).toHaveLength(Object.keys(BLESSED_DEPS).length)
		expect(appliable.every(c => c.kind === 'new')).toBe(true)
		expect(advisory).toHaveLength(0)
	})

	it('splits patch/minor as appliable and major as advisory', () => {
		const pkg = {
			dependencies: {
				'@capacitor/core': '^8.5.0',
				'@ionic/react': '^8.0.0',
			},
			devDependencies: {
				typescript: '^5.8.0',
			},
		}
		const {appliable, advisory} = planDepChanges(pkg as Record<string, unknown>)
		expect(
			appliable.some(c => c.pkg === '@capacitor/core' && c.kind === 'patch'),
		).toBe(true)
		expect(
			advisory.some(c => c.pkg === '@ionic/react' && c.kind === 'major'),
		).toBe(true)
	})

	it('ignores deps not in BLESSED_DEPS', () => {
		const deps: Record<string, string> = {}
		for (const [pkg, version] of Object.entries(BLESSED_DEPS)) {
			deps[pkg] = version
		}
		const pkg = {
			dependencies: {
				...deps,
				'some-other-lib': '^1.0.0',
			},
			devDependencies: {},
		}
		const {appliable, advisory} = planDepChanges(pkg as Record<string, unknown>)
		expect(appliable).toHaveLength(0)
		expect(advisory).toHaveLength(0)
	})
})
