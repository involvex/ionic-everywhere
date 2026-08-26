import {describe, expect, it} from 'vitest'
import {generateCompletions} from '../packages/ionic-everywhere/src/completions'
import {defaultAction} from '../packages/ionic-everywhere/src/dispatch'

describe('completions generator', () => {
	it('generates powershell completion script', () => {
		const script = generateCompletions('powershell')
		expect(script).toContain('Register-ArgumentCompleter')
		expect(script).toContain('ionic-everywhere')
		expect(script).toContain('ine')
	})

	it('generates bash completion script', () => {
		const script = generateCompletions('bash')
		expect(script).toContain('_ionic_everywhere_completions')
		expect(script).toContain('complete')
	})

	it('generates zsh completion script', () => {
		const script = generateCompletions('zsh')
		expect(script).toContain('#compdef ionic-everywhere')
	})

	it('generates fish completion script', () => {
		const script = generateCompletions('fish')
		expect(script).toContain('complete -c ionic-everywhere')
		expect(script).toContain('complete -c ine')
	})

	it('throws on unsupported shell', () => {
		expect(() => generateCompletions('unknown')).toThrowError(
			/Unsupported shell/,
		)
	})
})

describe('ine binary alias dispatch', () => {
	it('routes ine bin correctly', () => {
		expect(defaultAction(['doctor'], '/usr/local/bin/ine')).toBe('doctor')
		expect(defaultAction(['add', 'android'], 'ine.js')).toBe('add')
		expect(defaultAction([], 'ine')).toBe('new')
		expect(defaultAction(['--yes'], 'ine')).toBe('new')
	})
})
