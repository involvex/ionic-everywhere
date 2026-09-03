import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterAll, describe, expect, it} from 'vitest'
import {
	buildBuildAllScript,
	buildSyncScript,
	CANONICAL_SCRIPTS,
	prunePlatformScripts,
	syncPlatformScripts,
} from '../packages/ionic-everywhere/src/platform-scripts'
import {
	applyRunner,
	applyTokens,
	applyWorkspaces,
	generatorVersion,
	MANIFEST_NAME,
	scaffold,
	templateDir,
	tokenizeCopiedTree,
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
		const dir = templateDir('default')
		expect(existsSync(join(dir, 'package.json'))).toBe(true)
		expect(existsSync(join(dir, 'capacitor.config.ts'))).toBe(true)
		expect(existsSync(join(dir, 'src', 'App.tsx'))).toBe(true)
		expect(existsSync(join(dir, '.gitignore'))).toBe(true)
	})

	it('points at the minimal template variant', () => {
		const dir = templateDir('minimal')
		expect(existsSync(join(dir, 'package.json'))).toBe(true)
		expect(existsSync(join(dir, 'src', 'nav.ts'))).toBe(true)
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

	it('replaces the PM token, defaulting to npm (FEAT-024)', () => {
		const template = '__APP_PM__ run dev'
		expect(
			applyTokens(template, {
				appName: 'A',
				appId: 'io.x.a',
				nameKebab: 'a',
				pm: 'bun',
			}),
		).toBe('bun run dev')
		expect(
			applyTokens(template, {
				appName: 'A',
				appId: 'io.x.a',
				nameKebab: 'a',
			}),
		).toBe('npm run dev')
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
		expect(pkg.devDependencies.typescript).toMatch(/^\^5\./)
		expect(pkg.dependencies['react-router-dom']).toMatch(/^\^6\./)
		expect(pkg.dependencies['react-router']).toMatch(/^\^6\./)
		const cap = readFileSync(join(target, 'capacitor.config.ts'), 'utf8')
		expect(cap).toContain('io.involvex.test')
		expect(cap).not.toContain('__APP_ID__')
		const vite = readFileSync(join(target, 'vite.config.ts'), 'utf8')
		expect(vite).toContain('VitePWA')
		expect(vite).toContain('Test App')
		expect(vite).toContain('test-app')
		expect(vite).not.toContain('__APP_')
		const main = readFileSync(join(target, 'src', 'main.tsx'), 'utf8')
		expect(main).toContain('registerSW')
		expect(existsSync(join(target, 'public', 'icons', 'pwa-512.png'))).toBe(
			true,
		)
		expect(existsSync(join(target, 'assets', 'icon-only.png'))).toBe(true)
		expect(readdirSync(join(target, 'src', 'pages')).length).toBeGreaterThan(0)
	})

	it('template pins a pure-JS TypeScript (no native platform binaries)', () => {
		const templatePkg = JSON.parse(
			readFileSync(join(templateDir(), 'package.json'), 'utf8'),
		) as {devDependencies: Record<string, string>}
		expect(templatePkg.devDependencies.typescript).toMatch(/^\^5\./)
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
		expect(pkg.scripts.assets).toMatch(/^bun x @capacitor\/assets/)
		expect(JSON.stringify(pkg.scripts)).not.toContain('npm run')
		expect(JSON.stringify(pkg.scripts)).not.toMatch(/\bnpx\b/)
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
		expect(pkg.scripts.assets).toMatch(/^npx @capacitor\/assets/)
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

const FULL_SCRIPTS = {
	assets: 'npx @capacitor/assets generate --android --assetPath assets',
	dev: 'vite',
	build: 'tsc --noEmit && vite build',
	typecheck: 'tsc --noEmit',
	lint: 'eslint .',
	format: 'prettier --write .',
	sync: 'npm run build && cap sync android && cap sync @capawesome/capacitor-electron',
	android: 'cap run android',
	'android:dev': 'node scripts/android-dev.mjs',
	preandroid: 'npm run build && cap sync android',
	'open:android': 'cap open android',
	desktop: 'cd electron && npm run start',
	'desktop:dev': 'node scripts/desktop-dev.mjs',
	predesktop: 'npm run build && cap sync @capawesome/capacitor-electron',
	'build:desktop':
		'npm run build && cap sync @capawesome/capacitor-electron && cd electron && npm run pack',
	'build:android':
		'npm run build && cap sync android && node scripts/gradle.mjs assembleDebug',
	'build:all': 'npm run build:android && npm run build:desktop',
}

describe('prunePlatformScripts', () => {
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
		expect(scripts.assets).toBeUndefined()
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

describe('platform-scripts registry', () => {
	function applyBun(scripts: Record<string, string>): Record<string, string> {
		return applyRunner({...scripts}, 'bun')
	}

	it('template scripts match the registry exactly (drift guard)', () => {
		const templatePkg = JSON.parse(
			readFileSync(join(templateDir(), 'package.json'), 'utf8'),
		) as {scripts: Record<string, string>}
		const expected: Record<string, string> = {
			dev: 'vite',
			preview: 'vite preview',
			build: 'tsc --noEmit && vite build',
			typecheck: 'tsc --noEmit',
			lint: 'eslint .',
			'lint:fix': 'eslint . --fix',
			format: 'prettier --write .',
			'format:check': 'prettier --check .',
			...CANONICAL_SCRIPTS,
			sync: buildSyncScript(true, true),
			'build:all': buildBuildAllScript(true, true) as string,
		}
		expect(templatePkg.scripts).toEqual(expected)
	})

	it('syncPlatformScripts restores pruned platforms (round trip)', () => {
		const pkgPath = join(makeTemp(), 'package.json')
		writeFileSync(
			pkgPath,
			JSON.stringify({name: 'x', scripts: {...FULL_SCRIPTS}}),
		)
		prunePlatformScripts(pkgPath, true, false, 'bun')
		let pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
		expect(pkg.scripts['desktop']).toBeUndefined()
		syncPlatformScripts(pkgPath, true, true, 'bun')
		pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
		expect(pkg.scripts).toEqual(applyBun(FULL_SCRIPTS))
	})

	it('syncPlatformScripts can disable a platform again (add -> remove)', () => {
		const pkgPath = join(makeTemp(), 'package.json')
		writeFileSync(
			pkgPath,
			JSON.stringify({name: 'x', scripts: {...FULL_SCRIPTS}}),
		)
		syncPlatformScripts(pkgPath, false, true, 'bun')
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
		expect(pkg.scripts).toEqual(applyBun(prunedNoAndroid))
	})

	const prunedNoAndroid: Record<string, string> = (() => {
		const scripts = {...FULL_SCRIPTS}
		delete scripts.assets
		delete scripts.android
		delete scripts['android:dev']
		delete scripts.preandroid
		delete scripts['open:android']
		delete scripts['build:android']
		scripts.sync = 'npm run build && cap sync @capawesome/capacitor-electron'
		scripts['build:all'] = 'npm run build:desktop'
		return scripts
	})()
})

describe('applyRunner npx rewriting (R-3)', () => {
	it('rewrites npx only in invoker position', () => {
		const out = applyRunner(
			{
				assets: 'npx @capacitor/assets generate --android',
				chained: 'npm run build && npx some-tool --flag',
				argument: 'echo npx not-a-tool',
			},
			'bun',
		)
		expect(out.assets).toBe('bun x @capacitor/assets generate --android')
		expect(out.chained).toBe('bun run build && bun x some-tool --flag')
		expect(out.argument).toBe('echo npx not-a-tool')
	})

	it('does not mutate its input (FEAT-017)', () => {
		const input = {
			dev: 'npm run dev',
			assets: 'npx @capacitor/assets generate',
		}
		const snapshot = {...input}
		const out = applyRunner(input, 'bun')
		expect(input).toEqual(snapshot)
		expect(out).not.toBe(input)
	})
})

describe('testing scaffold (FEAT-012)', () => {
	it('enabled: moves overlay files, merges deps and scripts, removes staging', () => {
		const target = makeTemp()
		scaffold({
			targetDir: target,
			appName: 'Tested App',
			appId: 'io.involvex.tested',
			nameKebab: 'tested-app',
			tests: true,
		})
		expect(existsSync(join(target, 'vitest.config.ts'))).toBe(true)
		expect(existsSync(join(target, 'src', 'App.test.tsx'))).toBe(true)
		expect(existsSync(join(target, 'testing'))).toBe(false)
		const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'))
		expect(pkg.devDependencies.vitest).toMatch(/^\^4\./)
		expect(pkg.devDependencies['@testing-library/react']).toMatch(/^\^16\./)
		expect(pkg.devDependencies['@testing-library/dom']).toMatch(/^\^10\./)
		expect(pkg.scripts.test).toBe('vitest run')
		expect(pkg.scripts['test:watch']).toBe('vitest')
	})

	it('disabled (default): leaves no testing artifacts behind', () => {
		const target = makeTemp()
		scaffold({
			targetDir: target,
			appName: 'Plain App',
			appId: 'io.involvex.plain',
			nameKebab: 'plain-app',
		})
		expect(existsSync(join(target, 'vitest.config.ts'))).toBe(false)
		expect(existsSync(join(target, 'src', 'App.test.tsx'))).toBe(false)
		expect(existsSync(join(target, 'testing'))).toBe(false)
		const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'))
		expect(pkg.devDependencies.vitest).toBeUndefined()
		expect(pkg.scripts.test).toBeUndefined()
	})
})

describe('tokenizeCopiedTree (FEAT-011)', () => {
	it('rewrites token-bearing files anywhere and skips binary extensions', () => {
		const target = makeTemp()
		mkdirSync(join(target, 'nested'), {recursive: true})
		writeFileSync(
			join(target, 'nested', 'decoy.json'),
			'{"name": "__APP_NAME_KEBAB__"}',
		)
		writeFileSync(
			join(target, 'fake.bin.png'),
			'__APP_NAME__ inside a "binary"',
		)
		writeFileSync(join(target, 'clean.txt'), 'no tokens here')
		const written = tokenizeCopiedTree(target, {
			appName: 'Decoy App',
			appId: 'io.involvex.decoy',
			nameKebab: 'decoy-app',
		})
		const normalized = written.map(p => p.replaceAll('\\', '/'))
		expect(normalized).toContain('nested/decoy.json')
		expect(normalized).not.toContain('fake.bin.png')
		expect(readFileSync(join(target, 'nested', 'decoy.json'), 'utf8')).toBe(
			'{"name": "decoy-app"}',
		)
		expect(readFileSync(join(target, 'fake.bin.png'), 'utf8')).toContain(
			'__APP_NAME__',
		)
	})

	it('scaffold() auto-tokenizes the whole copied template', () => {
		const target = makeTemp()
		const written = scaffold({
			targetDir: target,
			appName: 'Tree App',
			appId: 'io.involvex.tree',
			nameKebab: 'tree-app',
		}).map(p => p.replaceAll('\\', '/'))
		for (const file of [
			'package.json',
			'capacitor.config.ts',
			'index.html',
			'vite.config.ts',
		]) {
			expect(written).toContain(file)
			expect(readFileSync(join(target, file), 'utf8')).not.toContain('__APP_')
		}
	})
})

describe('generator manifest (FEAT-022)', () => {
	it('records schema, generator version and scaffold options', () => {
		const target = makeTemp()
		scaffold({
			targetDir: target,
			appName: 'Manifest App',
			appId: 'io.involvex.manifest',
			nameKebab: 'manifest-app',
			pm: 'bun',
			tests: true,
		})
		const raw = readFileSync(join(target, MANIFEST_NAME), 'utf8')
		const manifest = JSON.parse(raw) as {
			schema: number
			generator: string
			generatorVersion: string
			createdAt: string
			options: Record<string, unknown>
		}
		expect(manifest.schema).toBe(1)
		expect(manifest.generator).toBe('@involvex/ionic-everywhere')
		expect(manifest.generatorVersion).toBe(generatorVersion())
		expect(Number.isNaN(Date.parse(manifest.createdAt))).toBe(false)
		expect(manifest.options).toMatchObject({
			appName: 'Manifest App',
			appId: 'io.involvex.manifest',
			nameKebab: 'manifest-app',
			pm: 'bun',
			tests: true,
		})
	})

	it('defaults platforms to both when not specified', () => {
		const target = makeTemp()
		scaffold({
			targetDir: target,
			appName: 'D App',
			appId: 'io.x.d',
			nameKebab: 'd',
		})
		const {options} = JSON.parse(
			readFileSync(join(target, MANIFEST_NAME), 'utf8'),
		) as {options: Record<string, unknown>}
		expect(options).toMatchObject({
			pm: 'npm',
			android: true,
			electron: true,
			tests: false,
		})
	})

	it('records pruned platforms as false (FEAT-013 rollback safety)', () => {
		const target = makeTemp()
		scaffold({
			targetDir: target,
			appName: 'Web Only',
			appId: 'io.x.webonly',
			nameKebab: 'web-only',
			android: false,
			electron: false,
		})
		const {options} = JSON.parse(
			readFileSync(join(target, MANIFEST_NAME), 'utf8'),
		) as {options: Record<string, unknown>}
		expect(options.android).toBe(false)
		expect(options.electron).toBe(false)
	})
})

describe('README + editor scaffolding (FEAT-024 / FEAT-026)', () => {
	it('template ships VS Code extension recommendations', () => {
		const recs = JSON.parse(
			readFileSync(join(templateDir(), '.vscode', 'extensions.json'), 'utf8'),
		) as {recommendations: string[]}
		expect(recs.recommendations).toContain('esbenp.prettier-vscode')
		expect(recs.recommendations).toContain('dbaeumer.vscode-eslint')
	})

	it('generated README names the chosen package manager', () => {
		const target = makeTemp()
		scaffold({
			targetDir: target,
			appName: 'Readme App',
			appId: 'io.x.readme',
			nameKebab: 'readme-app',
			pm: 'pnpm',
		})
		const readme = readFileSync(join(target, 'README.md'), 'utf8')
		expect(readme).toContain('pnpm run assets')
		expect(readme).not.toContain('<pm>')
		expect(readme).not.toContain('__APP_PM__')
	})
})

describe('template token drift guard (FEAT-032)', () => {
	function walkTemplateFiles(dir: string): string[] {
		const out: string[] = []
		for (const entry of readdirSync(dir, {withFileTypes: true})) {
			const full = join(dir, entry.name)
			if (entry.isDirectory()) out.push(...walkTemplateFiles(full))
			else if (entry.isFile()) out.push(full)
		}
		return out
	}

	it('no template file contains formatter-corrupted tokens', () => {
		// Prettier once rewrote __APP_NAME__ to markdown bold (**APP_NAME**),
		// which tokenizeCopiedTree() no longer matched — generated apps shipped
		// a literal heading. Templates are prettier-ignored now; this guards
		// against any future re-corruption.
		for (const file of walkTemplateFiles(templateDir())) {
			const content = readFileSync(file, 'utf8')
			expect(content).not.toMatch(/\*\*APP_[A-Z_]+\*\*/)
		}
	})

	it('template README H1 carries the intact __APP_NAME__ token', () => {
		const readme = readFileSync(join(templateDir(), 'README.md'), 'utf8')
		expect(readme.startsWith('# __APP_NAME__')).toBe(true)
	})

	it('generated README heading is the real app name', () => {
		const target = makeTemp()
		scaffold({
			targetDir: target,
			appName: 'Drift App',
			appId: 'io.x.drift',
			nameKebab: 'drift-app',
			pm: 'bun',
		})
		const readme = readFileSync(join(target, 'README.md'), 'utf8')
		expect(readme.startsWith('# Drift App')).toBe(true)
	})
})

describe('data-driven nav model + ErrorBoundary (FEAT-008/020)', () => {
	it('template ships a nav model as the single navigation source', () => {
		const nav = readFileSync(join(templateDir(), 'src', 'nav.ts'), 'utf8')
		expect(nav).toContain('export const NAV_ITEMS')
		expect(nav).toContain('export const HOME_PATH')
	})

	it('shell wiring derives from the nav model, not hardcoded routes', () => {
		const app = readFileSync(join(templateDir(), 'src', 'App.tsx'), 'utf8')
		const menu = readFileSync(
			join(templateDir(), 'src', 'components', 'AppMenu.tsx'),
			'utf8',
		)
		expect(app).toContain("from './nav'")
		expect(app).toContain('NAV_ITEMS.map')
		// no per-page <Route> blocks left in App.tsx
		expect(app).not.toContain('DashboardPage')
		expect(menu).toContain('NAV_ITEMS.map')
		expect(menu).toContain('__APP_NAME__') // title tokenized (FEAT-011)
	})

	it('every page renders inside an ErrorBoundary', () => {
		const boundary = readFileSync(
			join(templateDir(), 'src', 'components', 'ErrorBoundary.tsx'),
			'utf8',
		)
		expect(boundary).toContain('getDerivedStateFromError')
		const app = readFileSync(join(templateDir(), 'src', 'App.tsx'), 'utf8')
		expect(app).toContain('<ErrorBoundary>')
	})

	it('generated app menu title is the real app name', () => {
		const target = makeTemp()
		scaffold({
			targetDir: target,
			appName: 'Nav App',
			appId: 'io.x.nav',
			nameKebab: 'nav-app',
			pm: 'npm',
		})
		const menu = readFileSync(
			join(target, 'src', 'components', 'AppMenu.tsx'),
			'utf8',
		)
		expect(menu).toContain('<IonTitle>Nav App</IonTitle>')
		expect(menu).not.toContain('__APP_NAME__')
		expect(existsSync(join(target, 'src', 'nav.ts'))).toBe(true)
		expect(
			existsSync(join(target, 'src', 'components', 'ErrorBoundary.tsx')),
		).toBe(true)
	})
})

describe('interactive scaffolding options (layout, styling, theme)', () => {
	it('scaffolds with drawer layout, tailwind styling and hacker theme', () => {
		const target = makeTemp()
		scaffold({
			targetDir: target,
			appName: 'Custom App',
			appId: 'io.x.custom',
			nameKebab: 'custom-app',
			layout: 'drawer',
			styling: 'tailwind',
			theme: 'hacker',
		})
		expect(existsSync(join(target, 'tailwind.config.ts'))).toBe(true)
		expect(existsSync(join(target, 'postcss.config.cjs'))).toBe(true)
		expect(existsSync(join(target, 'src', 'theme', 'hacker.css'))).toBe(true)
		const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'))
		expect(pkg.devDependencies.tailwindcss).toBeDefined()
		const manifest = JSON.parse(
			readFileSync(join(target, MANIFEST_NAME), 'utf8'),
		)
		expect(manifest.options.layout).toBe('drawer')
		expect(manifest.options.styling).toBe('tailwind')
		expect(manifest.options.theme).toBe('hacker')
	})
})
