import {describe, expect, it} from 'vitest'
import {runSign} from '../packages/ionic-everywhere/src/sign'

describe('sign command', () => {
	it('exports runSign function', () => {
		expect(typeof runSign).toBe('function')
	})
})
