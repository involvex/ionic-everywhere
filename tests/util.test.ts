import {describe, expect, it} from 'vitest'
import {
	deriveAppId,
	detectPm,
	isValidAppId,
	parseFlags,
	toKebab,
	toTitle,
} from '../packages/ionic-everywhere/src/util'

describe('toKebab', () => {
	it('converts names to kebab-case', () => {
		expect(toKebab('My Cool App')).toBe('my-cool-app')
		expect(toKebab('my_app.v2')).toBe('my-app-v2')
		expect(toKebab('  FooBar  ')).toBe('foo-bar')
	})
})

describe('toTitle', () => {
	it('converts kebab to title case', () => {
		expect(toTitle('my-cool-app')).toBe('My Cool App')
		expect(toTitle('todo_list')).toBe('Todo List')
	})
})

describe('deriveAppId', () => {
	it('derives valid reverse-DNS ids', () => {
		expect(deriveAppId('my-app')).toBe('io.involvex.my.app')
		expect(deriveAppId('app')).toBe('io.involvex.app')
	})
	it('strips leading digits per segment', () => {
		const id = deriveAppId('2026-vision')
		expect(id.startsWith('io.involvex.')).toBe(true)
		expect(isValidAppId(id)).toBe(true)
	})
})

describe('isValidAppId', () => {
	it('accepts standard ids', () => {
		expect(isValidAppId('com.example.app')).toBe(true)
		expect(isValidAppId('io.involvex.my_app')).toBe(true)
	})
	it('rejects malformed ids', () => {
		expect(isValidAppId('single')).toBe(false)
		expect(isValidAppId('1com.example')).toBe(false)
		expect(isValidAppId('com.Example.app')).toBe(false)
	})
})

describe('parseFlags', () => {
	it('parses --no-x as false', () => {
		const {flags} = parseFlags(['--no-install'])
		expect(flags.install).toBe(false)
	})
	it('parses --key value and positionals', () => {
		const {positionals, flags} = parseFlags([
			'my-app',
			'--name',
			'Cool',
			'--pm=npm',
		])
		expect(positionals).toEqual(['my-app'])
		expect(flags.name).toBe('Cool')
		expect(flags.pm).toBe('npm')
	})
	it('supports short aliases', () => {
		const {flags} = parseFlags(['-y'])
		expect(flags.yes).toBe(true)
	})
	it('parses platform skip flags', () => {
		const {flags} = parseFlags(['--no-android', '--no-electron'])
		expect(flags.android).toBe(false)
		expect(flags.electron).toBe(false)
		const enabled = parseFlags([]).flags
		expect(enabled.android).toBeUndefined()
		expect(enabled.electron).toBeUndefined()
	})
})

describe('detectPm', () => {
	it('defaults to bun without user agent', () => {
		delete process.env.npm_config_user_agent
		expect(detectPm()).toBe('bun')
	})
})
