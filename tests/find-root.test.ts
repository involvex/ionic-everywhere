import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterAll, describe, expect, it} from 'vitest'
import {findProjectRoot} from '../packages/ionic-everywhere/src/add'

const tempDirs: string[] = []
function makeTemp(): string {
	const dir = mkdtempSync(join(tmpdir(), 'ie-findroot-'))
	tempDirs.push(dir)
	return dir
}
afterAll(() => {
	for (const dir of tempDirs) rmSync(dir, {recursive: true, force: true})
})

describe('findProjectRoot (FEAT-028)', () => {
	it('finds the nearest ancestor containing capacitor.config.ts', () => {
		const root = makeTemp()
		const nested = join(root, 'a', 'b', 'c')
		mkdirSync(nested, {recursive: true})
		writeFileSync(join(root, 'capacitor.config.ts'), 'export default {}')
		expect(findProjectRoot(nested)).toBe(root)
	})

	it('prefers the closest marker when several exist', () => {
		const outer = makeTemp()
		const inner = join(outer, 'inner')
		mkdirSync(inner)
		writeFileSync(join(outer, 'capacitor.config.ts'), 'outer')
		writeFileSync(join(inner, 'capacitor.config.ts'), 'inner')
		expect(findProjectRoot(inner)).toBe(inner)
	})

	it('returns undefined when no ancestor has the marker', () => {
		const root = makeTemp()
		const nested = join(root, 'deep', 'deeper')
		mkdirSync(nested, {recursive: true})
		expect(findProjectRoot(nested)).toBeUndefined()
	})

	it('accepts relative start directories', () => {
		const root = makeTemp()
		writeFileSync(join(root, 'capacitor.config.ts'), 'x')
		const cwd = process.cwd()
		process.chdir(root)
		try {
			expect(findProjectRoot('.')).toBe(root)
		} finally {
			process.chdir(cwd)
		}
	})
})
