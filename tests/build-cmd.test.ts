import {describe, expect, it} from 'vitest'
import {
	normalizePlatform,
	runBuild,
} from '../packages/ionic-everywhere/src/build-cmd'

describe('build command', () => {
	it('exports runBuild and normalizePlatform functions', () => {
		expect(typeof runBuild).toBe('function')
		expect(typeof normalizePlatform).toBe('function')
	})

	it('normalizes platform values correctly', () => {
		expect(normalizePlatform('android')).toBe('android')
		expect(normalizePlatform('desktop')).toBe('desktop')
		expect(normalizePlatform('electron')).toBe('desktop')
		expect(normalizePlatform('web')).toBe('web')
		expect(normalizePlatform('all')).toBe('all')
		expect(normalizePlatform(undefined)).toBe('all')
		expect(normalizePlatform('unknown')).toBeUndefined()
	})
})
