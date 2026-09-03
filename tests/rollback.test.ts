import {existsSync, mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterAll, describe, expect, it, vi} from 'vitest'
import {
	runNew,
	type NewOptions,
	type PromptAdapter,
} from '../packages/ionic-everywhere/src/new'

const stepCalls = vi.hoisted(() => [] as string[])

vi.mock('../packages/ionic-everywhere/src/step', () => ({
	SCAFFOLD_LOG: 'test-scaffold.log',
	step: async (_s: unknown, messages: {start: string}) => {
		stepCalls.push(messages.start)
		return false
	},
}))

const tempDirs: string[] = []
function makeTemp(): string {
	const dir = mkdtempSync(join(tmpdir(), 'ie-rollback-'))
	tempDirs.push(dir)
	return dir
}
afterAll(() => {
	for (const dir of tempDirs) rmSync(dir, {recursive: true, force: true})
})

const base: NewOptions = {
	targetDir: '',
	appName: 'Rollback App',
	appId: 'io.involvex.rollback',
	pm: 'npm',
	layout: 'tabs',
	styling: 'ionic-css',
	theme: 'light-dark',
	install: true,
	android: true,
	electron: true,
	git: false,
	tests: false,
	yes: true,
}

function fakePrompts(
	confirmResult: boolean,
	confirms: string[] = [],
): PromptAdapter {
	return {
		text: async message => {
			throw new Error(`unexpected text prompt: ${message}`)
		},
		select: async message => {
			throw new Error(`unexpected select prompt: ${message}`)
		},
		confirm: async message => {
			confirms.push(message)
			return confirmResult
		},
	}
}

describe('runNew failure rollback (FEAT-013)', () => {
	it('auto-removes the partial project under --yes', async () => {
		const target = makeTemp()
		const code = await runNew(
			{...base, targetDir: target},
			fakePrompts(true),
			true,
		)
		expect(code).toBe(1)
		expect(stepCalls.length).toBeGreaterThan(0)
		expect(existsSync(target)).toBe(false)
	})

	it('keeps the partial project under --keep-on-failure', async () => {
		const target = makeTemp()
		const code = await runNew(
			{...base, targetDir: target, keepOnFailure: true},
			fakePrompts(true),
			true,
		)
		expect(code).toBe(1)
		expect(existsSync(target)).toBe(true)
	})

	it('asks before removing and keeps when declined', async () => {
		const target = makeTemp()
		const confirms: string[] = []
		const code = await runNew(
			{...base, targetDir: target, yes: false},
			fakePrompts(false, confirms),
			true,
		)
		expect(code).toBe(1)
		expect(
			confirms.some(c => c.startsWith('Remove the partially created')),
		).toBe(true)
		expect(existsSync(target)).toBe(true)
	})

	it('removes when the interactive question is accepted', async () => {
		const target = makeTemp()
		const confirms: string[] = []
		const code = await runNew(
			{...base, targetDir: target, yes: false},
			fakePrompts(true, confirms),
			true,
		)
		expect(code).toBe(1)
		expect(confirms.length).toBeGreaterThan(0)
		expect(existsSync(target)).toBe(false)
	})
})
