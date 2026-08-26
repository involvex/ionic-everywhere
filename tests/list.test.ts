import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterAll, describe, expect, it} from 'vitest'
import {
	formatProjectReport,
	platformDirsPresent,
	readManifest,
	type GeneratorManifest,
} from '../packages/ionic-everywhere/src/list'
import {
	MANIFEST_NAME,
	scaffold,
} from '../packages/ionic-everywhere/src/scaffold'

const tempDirs: string[] = []
function makeTemp(): string {
	const dir = mkdtempSync(join(tmpdir(), 'ie-list-'))
	tempDirs.push(dir)
	return dir
}
afterAll(() => {
	for (const dir of tempDirs) rmSync(dir, {recursive: true, force: true})
})

describe('readManifest (FEAT-034)', () => {
	it('reads a manifest from a freshly scaffolded project', () => {
		const target = makeTemp()
		scaffold({
			targetDir: target,
			appName: 'List App',
			appId: 'io.x.list',
			nameKebab: 'list-app',
			pm: 'bun',
			tests: false,
		})
		const read = readManifest(target)
		expect(read.state).toBe('ok')
		if (read.state !== 'ok') return
		expect(read.manifest.generator).toBe('@involvex/ionic-everywhere')
		expect(typeof read.manifest.generatorVersion).toBe('string')
		expect(read.manifest.options?.pm).toBe('bun')
	})

	it('reports missing when no manifest exists', () => {
		const target = makeTemp()
		expect(readManifest(target).state).toBe('missing')
	})

	it('reports malformed for unparseable JSON', () => {
		const target = makeTemp()
		writeFileSync(join(target, MANIFEST_NAME), '{not json')
		const read = readManifest(target)
		expect(read.state).toBe('malformed')
	})

	it('reports malformed for non-object manifests', () => {
		const target = makeTemp()
		writeFileSync(join(target, MANIFEST_NAME), '[1, 2, 3]')
		const read = readManifest(target)
		expect(read.state).toBe('malformed')
	})
})

describe('project report (FEAT-034)', () => {
	it('detects present platform dirs only', () => {
		const root = makeTemp()
		mkdirSync(join(root, 'android'))
		expect(platformDirsPresent(root)).toEqual(['android'])
	})

	it('formats generator info and options', () => {
		const root = makeTemp()
		mkdirSync(join(root, 'electron'))
		const manifest: GeneratorManifest = {
			schema: 1,
			generator: '@involvex/ionic-everywhere',
			generatorVersion: '0.1.0',
			createdAt: '2026-08-26T00:00:00.000Z',
			options: {appName: 'Demo', appId: 'io.x.demo', pm: 'npm'},
		}
		const report = formatProjectReport(root, manifest)
		expect(report).toContain('@involvex/ionic-everywhere')
		expect(report).toContain('0.1.0 (schema 1)')
		expect(report).toContain('pm               : npm')
		expect(report).toContain('Platform dirs    : electron')
	})

	it('tolerates a manifest without options or version', () => {
		const root = makeTemp()
		const report = formatProjectReport(root, {})
		expect(report).toContain('unknown')
		expect(report).toContain('none')
	})
})
