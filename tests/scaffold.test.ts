import {
	existsSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterAll, describe, expect, it} from 'vitest'
import {
	applyTokens,
	applyWorkspaces,
	prunePlatformScripts,
	scaffold,
	templateDir,
} from '../packages/ionic-everywhere/src/scaffold'

const tempDirs: string[] = []

function makeTemp(): string {
	const dir = mkdtempSync(join(tmpdir(), 'ie-scaffold-'))
	tempDirs.push(dir)
	return dir
}

afterAll(() => {
	for (const dir of tempDirs) rmSync(dir, {recursive: true, force: true})
})

describe('templateDir', () => {
	it('points at an existing template with expected files', () => {
		const dir = templateDir()
		expect(existsSync(join(dir, 'package.json'))).toBe(true)
		expect(existsSync(join(dir, 'capacitor.config.ts'))).toBe(true)
		expect(existsSync(join(dir, 'src', 'App.tsx'))).toBe(true)
		expect(existsSync(join(dir, '.gitignore'))).toBe(true)
	})
})

describe('applyTokens', () => {
	it('replaces all tokens', () => {
		const out = applyTokens(
			'"name": "__APP_NAME_KEBAB__" __APP_NAME__ __APP_ID__',
			{
				appName: 'Cool App',
				appId: 'io.involvex.cool',
				nameKebab: 'cool-app',
			},
		)
		expect(out).toContain('cool-app')
		expect(out).toContain('Cool App')
		expect(out).toContain('io.involvex.cool')
		expect(out).not.toContain('__APP')
	})
})

describe('scaffold', () => {
	it('copies and tokenizes into an empty target', () => {
		const target = makeTemp()
		const written = scaffold({
			targetDir: target,
			appName: 'Test App',
			appId: 'io.involvex.test',
			nameKebab: 'test-app',
		})
		expect(written).toContain('package.json')
		const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'))
		expect(pkg.name).toBe('test-app')
		expect(pkg.scripts.sync).toContain('@capawesome/capacitor-electron')
		const cap = readFileSync(join(target, 'capacitor.config.ts'), 'utf8')
		expect(cap).toContain('io.involvex.test')
		expect(cap).not.toContain('__APP_ID__')
		expect(readdirSync(join(target, 'src', 'pages')).length).toBeGreaterThan(0)
	})

	it('refuses non-empty targets', () => {
		const target = makeTemp()
		scaffold({
			targetDir: target,
			appName: 'First',
			appId: 'io.x.first',
			nameKebab: 'first',
		})
		expect(() =>
			scaffold({
				targetDir: target,
				appName: 'X',
				appId: 'io.x.y',
				nameKebab: 'x',
			}),
		).toThrow(/not empty/i)
	})

	it('rewrites chained scripts to the chosen package manager', () => {
		const target = makeTemp()
		scaffold({
			targetDir: target,
			appName: 'Bun App',
			appId: 'io.x.bunapp',
			nameKebab: 'bun-app',
			pm: 'bun',
		})
		const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'))
		expect(pkg.scripts.sync).toMatch(/^bun run build && cap sync android/)
		expect(pkg.scripts.predesktop).toContain('bun run')
		expect(pkg.scripts['build:desktop']).toContain(
			'cd electron && bun run pack',
		)
		expect(pkg.scripts.desktop).toBe('cd electron && bun run start')
		expect(pkg.scripts.android).toBe('cap run android')
		expect(pkg.scripts.preandroid).toContain(
			'bun run build && cap sync android',
		)
		expect(JSON.stringify(pkg.scripts)).not.toContain('npm run')
	})

	it('keeps npm chains when no pm given', () => {
		const target = makeTemp()
		scaffold({
			targetDir: target,
			appName: 'Npm App',
			appId: 'io.x.npmapp',
			nameKebab: 'npm-app',
		})
		const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'))
		expect(pkg.scripts.sync).toMatch(/^npm run build/)
		expect(pkg.scripts.typecheck).toBe('tsc --noEmit')
		expect(pkg.scripts.lint).toBe('eslint .')
		expect(pkg.scripts.format).toBe('prettier --write .')
	})
})

describe('applyWorkspaces', () => {
	function makePkgWith(workspaces?: string[]): string {
		const dir = makeTemp()
		const pkgPath = join(dir, 'package.json')
		writeFileSync(
			pkgPath,
			JSON.stringify({name: 'x', ...(workspaces ? {workspaces} : {})}),
		)
		return pkgPath
	}

	it('adds electron workspace when enabled', () => {
		const pkgPath = makePkgWith()
		applyWorkspaces(pkgPath, true)
		expect(JSON.parse(readFileSync(pkgPath, 'utf8')).workspaces).toEqual([
			'electron',
		])
	})

	it('keeps existing workspace entries', () => {
		const pkgPath = makePkgWith(['packages/*'])
		applyWorkspaces(pkgPath, true)
		expect(JSON.parse(readFileSync(pkgPath, 'utf8')).workspaces).toEqual([
			'electron',
			'packages/*',
		])
	})

	it('removes workspaces entirely when electron disabled', () => {
		const pkgPath = makePkgWith(['electron'])
		applyWorkspaces(pkgPath, false)
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
		expect(pkg.workspaces).toBeUndefined()
	})
})

describe('prunePlatformScripts', () => {
	const FULL_SCRIPTS = {
		dev: 'vite',
		build: 'tsc --noEmit && vite build',
		typecheck: 'tsc --noEmit',
		lint: 'eslint .',
		format: 'prettier --write .',
		sync: 'npm run build && cap sync android && cap sync @capawesome/capacitor-electron',
		android: 'cap run android',
		preandroid: 'npm run build && cap sync android',
		'open:android': 'cap open android',
		desktop: 'cd electron && npm run start',
		predesktop: 'npm run build && cap sync @capawesome/capacitor-electron',
		'build:desktop':
			'npm run build && cap sync @capawesome/capacitor-electron && cd electron && npm run pack',
		'build:android':
			'npm run build && cap sync android && cd android && gradlew assembleDebug',
		'build:all': 'npm run build:android && npm run build:desktop',
	}

	function makePkg(): string {
		const dir = makeTemp()
		const pkgPath = join(dir, 'package.json')
		writeFileSync(pkgPath, JSON.stringify({scripts: {...FULL_SCRIPTS}}))
		return pkgPath
	}

	it('keeps everything when both platforms enabled', () => {
		const pkgPath = makePkg()
		prunePlatformScripts(pkgPath, true, true)
		expect(JSON.parse(readFileSync(pkgPath, 'utf8')).scripts).toEqual(
			FULL_SCRIPTS,
		)
	})

	it('prunes desktop scripts when electron disabled', () => {
		const pkgPath = makePkg()
		prunePlatformScripts(pkgPath, true, false)
		const scripts = JSON.parse(readFileSync(pkgPath, 'utf8')).scripts
		expect(scripts['desktop']).toBeUndefined()
		expect(scripts['predesktop']).toBeUndefined()
		expect(scripts['build:desktop']).toBeUndefined()
		expect(scripts['android']).toBeDefined()
		expect(scripts['preandroid']).toBeDefined()
		expect(scripts.sync).not.toContain('@capawesome/capacitor-electron')
		expect(scripts.sync).toContain('cap sync android')
		expect(scripts['build:all']).toBe('npm run build:android')
	})

	it('prunes android scripts when android disabled', () => {
		const pkgPath = makePkg()
		prunePlatformScripts(pkgPath, false, true, 'bun')
		const scripts = JSON.parse(readFileSync(pkgPath, 'utf8')).scripts
		expect(scripts['android']).toBeUndefined()
		expect(scripts['preandroid']).toBeUndefined()
		expect(scripts['open:android']).toBeUndefined()
		expect(scripts['build:android']).toBeUndefined()
		expect(scripts['desktop']).toBeDefined()
		expect(scripts.sync).not.toContain('cap sync android')
		expect(scripts.sync).toContain('@capawesome/capacitor-electron')
		expect(scripts['build:all']).toBe('bun run build:desktop')
	})

	it('removes all platform scripts when both disabled', () => {
		const pkgPath = makePkg()
		prunePlatformScripts(pkgPath, false, false)
		const scripts = JSON.parse(readFileSync(pkgPath, 'utf8')).scripts
		expect(scripts.sync).not.toContain('cap sync')
		expect(scripts['build:all']).toBeUndefined()
		expect(scripts.dev).toBe('vite')
		expect(scripts.typecheck).toBe('tsc --noEmit')
	})
})
