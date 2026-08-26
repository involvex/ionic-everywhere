import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterAll, describe, expect, it} from 'vitest'
import {runStreaming} from '../packages/ionic-everywhere/src/run'

const tempDirs: string[] = []

function makeTemp(): string {
	const dir = mkdtempSync(join(tmpdir(), 'ie-run-'))
	tempDirs.push(dir)
	return dir
}

function scriptFile(dir: string, name: string, code: string): string {
	const path = join(dir, name)
	writeFileSync(path, code)
	return path
}

function cmd(exe: string, path: string): string {
	return `"${exe}" "${path}"`
}

afterAll(() => {
	for (const dir of tempDirs) rmSync(dir, {recursive: true, force: true})
})

describe('runStreaming', () => {
	it('resolves with exit code 0 and captured stdout', async () => {
		const dir = makeTemp()
		const file = scriptFile(dir, 'ok.js', "console.log('hello-stream')")
		const res = await runStreaming(cmd(process.execPath, file), dir)
		expect(res.code).toBe(0)
		expect(res.tail.join('\n')).toContain('hello-stream')
	})

	it('captures stderr and non-zero exit codes', async () => {
		const dir = makeTemp()
		const file = scriptFile(
			dir,
			'fail.js',
			"console.error('boom-stream'); process.exit(3)",
		)
		const res = await runStreaming(cmd(process.execPath, file), dir)
		expect(res.code).toBe(3)
		expect(res.tail.join('\n')).toContain('boom-stream')
	})

	it('resolves with shell diagnostics when the target is missing', async () => {
		const dir = makeTemp()
		const res = await runStreaming(
			`"${process.execPath}" "${join(dir, 'does-not-exist.js')}"`,
			dir,
		)
		expect(res.code).not.toBe(0)
		expect(res.tail.join('\n')).toContain('Cannot find module')
	})

	it('survives output far beyond any buffer limit and tees to the log file', async () => {
		const dir = makeTemp()
		const log = join(dir, 'nested', 'run.log')
		const file = scriptFile(
			dir,
			'loud.js',
			'for (let i = 0; i < 60000; i++) console.log(`line-${i}-${"x".repeat(30)}`)',
		)
		let linesSeen = 0
		const res = await runStreaming(cmd(process.execPath, file), dir, {
			logFile: log,
			onLine: () => {
				linesSeen++
			},
		})
		expect(res.code).toBe(0)
		expect(linesSeen).toBe(60_000)
		expect(res.tail.length).toBeLessThanOrEqual(50)
		expect(res.tail.at(-1)).toContain('line-59999')
		const logged = readFileSync(log, 'utf8')
		expect(logged).toContain('$ ')
		expect(logged).toContain('line-59999')
	}, 120_000)

	it('writes a command header into the log file', async () => {
		const dir = makeTemp()
		const log = join(dir, 'run.log')
		await runStreaming('echo ie-header-check', dir, {logFile: log})
		const logged = readFileSync(log, 'utf8')
		expect(logged).toContain('echo ie-header-check')
		expect(logged).toContain('cwd=')
	})
})
