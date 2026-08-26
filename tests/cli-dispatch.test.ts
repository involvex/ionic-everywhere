import {describe, expect, it} from 'vitest'
import {defaultAction} from '../packages/ionic-everywhere/src/dispatch'
import {
	resolveConfig,
	type NewOptions,
	type PromptAdapter,
} from '../packages/ionic-everywhere/src/new'

const base: Omit<NewOptions, 'targetDir' | 'appName' | 'appId' | 'pm'> = {
	install: true,
	android: true,
	electron: true,
	git: true,
	yes: false,
}

function rejectingPrompts(): PromptAdapter {
	return {
		text: async message => {
			throw new Error(`unexpected text prompt: ${message}`)
		},
		select: async message => {
			throw new Error(`unexpected select prompt: ${message}`)
		},
		confirm: async message => {
			throw new Error(`unexpected confirm prompt: ${message}`)
		},
	}
}

describe('defaultAction', () => {
	it('routes create-* bin names to new regardless of argv', () => {
		expect(
			defaultAction(['doctor'], '/usr/local/bin/create-ionic-everywhere'),
		).toBe('new')
		expect(defaultAction(['new'], 'create-ionic-everywhere.js')).toBe('new')
	})

	it('uses the first positional as the action', () => {
		expect(defaultAction(['doctor'], 'ionic-everywhere')).toBe('doctor')
		expect(defaultAction(['add', 'android'], 'ionic-everywhere')).toBe('add')
	})

	it('falls back to new for empty or flag-only argv', () => {
		expect(defaultAction([], 'ionic-everywhere')).toBe('new')
		expect(defaultAction(['--yes'], 'ionic-everywhere')).toBe('new')
		expect(defaultAction(['-h'], 'ionic-everywhere')).toBe('new')
	})
})

describe('resolveConfig precedence', () => {
	it('never prompts under --yes with explicit flags', async () => {
		const cfg = await resolveConfig(
			{
				...base,
				targetDir: 'given-dir',
				appName: 'Given',
				appId: 'com.x.given',
				pm: 'npm',
				yes: true,
			},
			rejectingPrompts(),
		)
		expect(cfg.appName).toBe('Given')
		expect(cfg.appId).toBe('com.x.given')
		expect(cfg.pm).toBe('npm')
		expect(cfg.git).toBe(true)
	})

	it('explicit flags suppress their interactive prompts', async () => {
		const prompts = rejectingPrompts()
		const cfg = await resolveConfig(
			{
				...base,
				targetDir: 'my-app',
				appName: 'Flag Name',
				appId: 'com.x.flag',
				pm: 'pnpm',
				git: false,
				tests: false,
			},
			prompts,
		)
		expect(cfg.appName).toBe('Flag Name')
		expect(cfg.pm).toBe('pnpm')
	})

	it('prompts interactively when flags are missing', async () => {
		const calls: string[] = []
		const prompts: PromptAdapter = {
			text: async message => {
				calls.push(message)
				if (message.startsWith('Where')) return 'asked-dir'
				if (message.startsWith('Display name')) return 'Asked App'
				if (message.startsWith('Application ID')) return 'com.x.asked'
				throw new Error(`unexpected text prompt: ${message}`)
			},
			select: async () => {
				calls.push('select-pm')
				return 'yarn'
			},
			confirm: async () => {
				calls.push('confirm-git')
				return false
			},
		}
		const cfg = await resolveConfig({...base}, prompts)
		expect(
			cfg.targetDir.endsWith('asked-dir') || cfg.dirName === 'asked-dir',
		).toBe(true)
		expect(cfg.appName).toBe('Asked App')
		expect(cfg.appId).toBe('com.x.asked')
		expect(cfg.pm).toBe('yarn')
		expect(cfg.git).toBe(false)
		expect(calls.some(c => c.startsWith('Where'))).toBe(true)
	})

	it('falls back to derived defaults for invalid prompted values', async () => {
		const prompts: PromptAdapter = {
			text: async message => {
				if (message.startsWith('Display name')) return '   '
				if (message.startsWith('Application ID')) return ''
				throw new Error(`unexpected text prompt: ${message}`)
			},
			select: async () => 'bun',
			confirm: async () => true,
		}
		const cfg = await resolveConfig({targetDir: 'my_app', ...base}, prompts)
		expect(cfg.nameKebab).toBe('my-app')
		expect(cfg.appName).toBe('My App')
		expect(cfg.appId).toBe('io.involvex.my.app')
	})
})
