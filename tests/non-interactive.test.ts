import {existsSync, mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest'
import {
	resolveConfig,
	runNew,
	type NewOptions,
	type PromptAdapter,
} from '../packages/ionic-everywhere/src/new'
import {isInteractive} from '../packages/ionic-everywhere/src/util'

vi.mock('../packages/ionic-everywhere/src/step', () => ({
	SCAFFOLD_LOG: 'test-scaffold.log',
	step: async () => false,
}))

class ExitCalled extends Error {}

// die() prints through clack (ANSI-decorated stdout) then process.exit(1).
// Capture both streams so assertions can match plain substrings.
const captured: string[] = []
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;?]*[a-zA-Z]`, 'g')

beforeAll(() => {
	const capture = (chunk: unknown): boolean => {
		captured.push(String(chunk).replace(ANSI, ''))
		return true
	}
	vi.spyOn(process.stdout, 'write').mockImplementation(capture as never)
	vi.spyOn(process.stderr, 'write').mockImplementation(capture as never)
})

const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((
	code?: number,
) => {
	throw new ExitCalled(`exit ${code}`)
}) as never)

afterEach(() => {
	captured.length = 0
})

afterAll(() => {
	exitSpy.mockRestore()
	vi.restoreAllMocks()
})

const tempDirs: string[] = []
function makeTemp(): string {
	const dir = mkdtempSync(join(tmpdir(), 'ie-nontty-'))
	tempDirs.push(dir)
	return dir
}
afterAll(() => {
	for (const dir of tempDirs) rmSync(dir, {recursive: true, force: true})
})

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

const base: NewOptions = {
	install: true,
	android: true,
	electron: true,
	git: true,
	yes: false,
}

describe('isInteractive', () => {
	it('requires both streams to be TTYs', () => {
		expect(isInteractive({isTTY: true}, {isTTY: true})).toBe(true)
		expect(isInteractive({isTTY: false}, {isTTY: true})).toBe(false)
		expect(isInteractive({isTTY: true}, {})).toBe(false)
	})
})

describe('resolveConfig under a non-interactive shell (FEAT-021)', () => {
	it('exits with flag hints instead of prompting when values are missing', async () => {
		await expect(
			resolveConfig(
				{...base, targetDir: makeTemp(), appName: 'Known App'},
				rejectingPrompts(),
				false,
			),
		).rejects.toThrow(ExitCalled)
		const msg = captured.join('')
		expect(msg).toContain('Non-interactive shell detected')
		expect(msg).toContain('--yes')
		expect(msg).not.toContain('--name')
		expect(msg).toContain('--app-id')
		expect(msg).toContain('--pm')
	})

	it('exits with the usage line when no target directory is given', async () => {
		await expect(
			resolveConfig({...base}, rejectingPrompts(), false),
		).rejects.toThrow(ExitCalled)
		expect(captured.join('')).toContain(
			'No target directory given. Usage: ionic-everywhere new <dir>',
		)
	})

	it('proceeds without prompting when every value input is supplied', async () => {
		const cfg = await resolveConfig(
			{
				...base,
				targetDir: makeTemp(),
				appName: 'Headless App',
				appId: 'com.x.headless',
				pm: 'bun',
			},
			rejectingPrompts(),
			false,
		)
		expect(cfg.appName).toBe('Headless App')
		expect(cfg.pm).toBe('bun')
		expect(cfg.git).toBe(true)
		expect(cfg.tests).toBe(false)
	})
})

describe('runNew cleanup under a non-interactive shell (FEAT-021)', () => {
	it('keeps the partial project without prompting on failure', async () => {
		const target = makeTemp()
		const code = await runNew(
			{
				...base,
				targetDir: target,
				appName: 'Headless App',
				appId: 'com.x.headless',
				pm: 'bun',
			},
			rejectingPrompts(),
			false,
		)
		expect(code).toBe(1)
		expect(existsSync(target)).toBe(true)
	})
})
