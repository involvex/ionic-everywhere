import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterAll, describe, expect, it} from 'vitest'
import {ensureElectronDevToolsHook} from '../packages/ionic-everywhere/src/scaffold'

const GENERATED_CONFIG = `import { defineConfig } from '@capawesome/capacitor-electron/config';

export default defineConfig({
  window: {
    width: 1200,
    height: 800,
  },
});
`

const CUSTOMIZED_CONFIG = `import { defineConfig } from '@capawesome/capacitor-electron/config';

export default defineConfig({
  window: {width: 900},
  hooks: {
    beforeReady: app => {
      app.commandLine.appendSwitch('disable-http-cache')
    },
  },
});
`

describe('ensureElectronDevToolsHook', () => {
	const tempDirs: string[] = []
	function makeApp(config: string): string {
		const dir = mkdtempSync(join(tmpdir(), 'ie-devtools-'))
		tempDirs.push(dir)
		mkdirSync(join(dir, 'electron'), {recursive: true})
		writeFileSync(join(dir, 'electron', 'capacitor.electron.config.ts'), config)
		return dir
	}
	afterAll(() => {
		for (const dir of tempDirs) rmSync(dir, {recursive: true, force: true})
	})

	it('injects an env-guarded DevTools hook into generated configs', () => {
		const dir = makeApp(GENERATED_CONFIG)
		expect(ensureElectronDevToolsHook(dir)).toBe(true)
		const patched = readFileSync(
			join(dir, 'electron', 'capacitor.electron.config.ts'),
			'utf8',
		)
		expect(patched).toContain('onWindowCreated')
		expect(patched).toContain('CAPACITOR_ELECTRON_DEV_SERVER_URL')
		expect(patched).toContain("openDevTools({mode: 'detach'})")
		// original content preserved
		expect(patched).toContain('window: {')
		expect(patched).toContain("'@capawesome/capacitor-electron/config'")
	})

	it('is idempotent - no duplicate hooks on repeated runs', () => {
		const dir = makeApp(GENERATED_CONFIG)
		ensureElectronDevToolsHook(dir)
		const once = readFileSync(
			join(dir, 'electron', 'capacitor.electron.config.ts'),
			'utf8',
		)
		expect(ensureElectronDevToolsHook(dir)).toBe(true)
		const twice = readFileSync(
			join(dir, 'electron', 'capacitor.electron.config.ts'),
			'utf8',
		)
		expect(twice).toBe(once)
	})

	it('leaves user-customized configs untouched', () => {
		const dir = makeApp(CUSTOMIZED_CONFIG)
		expect(ensureElectronDevToolsHook(dir)).toBe(false)
		expect(
			readFileSync(
				join(dir, 'electron', 'capacitor.electron.config.ts'),
				'utf8',
			),
		).toBe(CUSTOMIZED_CONFIG)
	})

	it('returns false when the platform is absent', () => {
		const dir = mkdtempSync(join(tmpdir(), 'ie-devtools-empty-'))
		tempDirs.push(dir)
		expect(ensureElectronDevToolsHook(dir)).toBe(false)
		expect(existsSync(join(dir, 'electron'))).toBe(false)
	})
})
