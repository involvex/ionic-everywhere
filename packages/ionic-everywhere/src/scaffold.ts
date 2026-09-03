import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	renameSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import {dirname, extname, join, relative} from 'node:path'
import {fileURLToPath} from 'node:url'

export interface ScaffoldOptions {
	targetDir: string
	appName: string
	appId: string
	nameKebab: string
	pm?: string
	/** Include the Android platform (recorded in the generator manifest). */
	android?: boolean
	/** Include the desktop platform (recorded in the generator manifest). */
	electron?: boolean
	/** Opt-in Vitest testing scaffold (FEAT-012). */
	tests?: boolean
	/** Template variant ('default' / 'full' or 'minimal'). */
	templateVariant?: string
	layout?: string
	styling?: string
	theme?: string
}

export const MANIFEST_NAME = '.ionic-everywhere.json'

/**
 * Version of the CLI package itself, recorded in every generated project's
 * manifest (FEAT-022) so future tooling can detect which template produced it.
 */
export function generatorVersion(): string {
	try {
		const pkg = JSON.parse(
			readFileSync(
				join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'),
				'utf8',
			),
		) as {version?: string}
		return pkg.version ?? '0.0.0'
	} catch {
		return '0.0.0'
	}
}

/**
 * Dev dependencies injected when the testing scaffold is enabled. Pure-JS
 * packages only; @testing-library/dom is listed explicitly because it is a
 * peer of @testing-library/react and bun does not auto-install peers.
 */
const TEST_DEV_DEPS: Record<string, string> = {
	vitest: '^4.1.11',
	jsdom: '^30.0.1',
	'@testing-library/react': '^16.3.2',
	'@testing-library/dom': '^10.4.1',
}

const TEST_SCRIPTS: Record<string, string> = {
	test: 'vitest run',
	'test:watch': 'vitest',
}

export function templateDir(variant = 'default'): string {
	const dir = variant === 'minimal' ? 'minimal' : 'default'
	return join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', dir)
}

const BINARY_EXTS = new Set([
	'.apk',
	'.dll',
	'.dylib',
	'.eot',
	'.exe',
	'.gif',
	'.gz',
	'.ico',
	'.icns',
	'.jar',
	'.jpeg',
	'.jpg',
	'.jks',
	'.keystore',
	'.node',
	'.otf',
	'.png',
	'.so',
	'.tar',
	'.ttf',
	'.webp',
	'.woff',
	'.woff2',
	'.zip',
])

const TOKEN_PATTERN = /__APP_[A-Z_]+__/

export function applyTokens(
	content: string,
	opts: Pick<ScaffoldOptions, 'appName' | 'appId' | 'nameKebab' | 'pm'>,
): string {
	return content
		.replaceAll('__APP_NAME__', opts.appName)
		.replaceAll('__APP_ID__', opts.appId)
		.replaceAll('__APP_NAME_KEBAB__', opts.nameKebab)
		.replaceAll('__APP_PM__', opts.pm ?? 'npm')
}

const PM_DLX: Partial<Record<string, string>> = {
	bun: 'bun x',
	pnpm: 'pnpm dlx',
	yarn: 'yarn dlx',
}

export function applyRunner(
	scripts: Record<string, string>,
	pm?: string,
): Record<string, string> {
	const result = {...scripts}
	if (!pm || pm === 'npm') return result
	const runner = `${pm} run`
	const dlx = PM_DLX[pm]
	for (const key of Object.keys(result)) {
		let value = result[key].replaceAll('npm run', runner)
		// Rewrite npx only in invoker position (start of value or after a chain
		// segment), never inside arbitrary arguments like `echo npx foo`.
		if (dlx) value = value.replace(/(^|&&\s*)npx\s/g, `$1${dlx} `)
		result[key] = value
	}
	return result
}

/** Directory names never walked by the scanners below. */
const SKIP_DIRS = new Set(['.git', 'node_modules'])

function walkFiles(root: string): string[] {
	const out: string[] = []
	const visit = (dir: string): void => {
		for (const entry of readdirSync(dir, {withFileTypes: true})) {
			const full = join(dir, entry.name)
			if (entry.isDirectory()) {
				if (!SKIP_DIRS.has(entry.name)) visit(full)
			} else if (entry.isFile()) out.push(full)
		}
	}
	visit(root)
	return out
}

function toPosix(p: string): string {
	return p.split('\\').join('/')
}

/**
 * Rewrite every copied file that still carries `__APP_*__` tokens. Files are
 * discovered by content (not a hardcoded list) so new tokenized template files
 * cannot be forgotten; binary extensions are skipped.
 */
export function tokenizeCopiedTree(
	targetDir: string,
	opts: Pick<ScaffoldOptions, 'appName' | 'appId' | 'nameKebab' | 'pm'>,
): string[] {
	const written: string[] = []
	for (const path of walkFiles(targetDir)) {
		if (BINARY_EXTS.has(extname(path).toLowerCase())) continue
		const content = readFileSync(path, 'utf8')
		if (!TOKEN_PATTERN.test(content)) continue
		writeFileSync(path, applyTokens(content, opts))
		written.push(relative(targetDir, path))
	}
	return written
}

export function assertEmptyTarget(targetDir: string): void {
	if (!existsSync(targetDir)) return
	const entries = readdirSync(targetDir)
	if (entries.length > 0) {
		throw new Error(`Target directory is not empty: ${targetDir}`)
	}
}

/**
 * Materialize (or drop) the testing scaffold. The template stages the files
 * under `testing/` so they ride along with the normal copy; they never ship
 * in the generated app unless enabled.
 */
export function applyTestingScaffold(
	targetDir: string,
	pkgPath: string,
	enabled: boolean | undefined,
	pm?: string,
): void {
	const staging = join(targetDir, 'testing')
	if (!enabled) {
		rmSync(staging, {recursive: true, force: true})
		return
	}
	mkdirSync(join(targetDir, 'src'), {recursive: true})
	renameSync(
		join(staging, 'vitest.config.ts'),
		join(targetDir, 'vitest.config.ts'),
	)
	renameSync(
		join(staging, 'App.test.tsx'),
		join(targetDir, 'src', 'App.test.tsx'),
	)
	rmSync(staging, {recursive: true, force: true})

	const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
		scripts?: Record<string, string>
		devDependencies?: Record<string, string>
	}
	pkg.devDependencies = {
		...(pkg.devDependencies ?? {}),
		...TEST_DEV_DEPS,
	}
	pkg.scripts = applyRunner({...TEST_SCRIPTS, ...(pkg.scripts ?? {})}, pm)
	writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
}

/**
 * Record how (and by what) this project was generated (FEAT-022). Written
 * last so it reflects the final state after script rewriting and testing-
 * scaffold pruning. `schema` lets future upgrade tooling evolve the shape.
 */
export function overlayDir(type: string, name: string): string {
	return join(
		dirname(fileURLToPath(import.meta.url)),
		'..',
		'templates',
		'overlays',
		`${type}-${name}`,
	)
}

export function applyOverlays(targetDir: string, opts: ScaffoldOptions): void {
	if (opts.layout && opts.layout !== 'tabs') {
		const src = overlayDir('layout', opts.layout)
		if (existsSync(src)) {
			cpSync(src, targetDir, {recursive: true, force: true})
		}
	}
	if (opts.styling && opts.styling !== 'ionic-css') {
		const src = overlayDir('style', opts.styling)
		if (existsSync(src)) {
			cpSync(src, targetDir, {recursive: true, force: true})
		}
	}
	if (opts.theme && opts.theme !== 'light-dark') {
		const src = overlayDir('theme', opts.theme)
		if (existsSync(src)) {
			cpSync(src, targetDir, {recursive: true, force: true})
		}
	}
}

const STYLING_DEV_DEPS: Record<string, Record<string, string>> = {
	tailwind: {
		tailwindcss: '^4.0.0',
		postcss: '^8.5.3',
		autoprefixer: '^10.4.20',
	},
	shadcn: {
		tailwindcss: '^4.0.0',
		postcss: '^8.5.3',
		autoprefixer: '^10.4.20',
		clsx: '^2.1.1',
		'tailwind-merge': '^3.0.1',
	},
	kumo: {
		'@cloudflare/kumo': '^0.1.0',
	},
}

export function applyStylingScaffold(
	targetDir: string,
	pkgPath: string,
	styling?: string,
): void {
	if (!styling || styling === 'ionic-css') return
	const deps = STYLING_DEV_DEPS[styling]
	if (!deps) return
	if (!existsSync(pkgPath)) return
	const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
		devDependencies?: Record<string, string>
		dependencies?: Record<string, string>
	}
	if (styling === 'kumo') {
		pkg.dependencies = {
			...(pkg.dependencies ?? {}),
			...deps,
		}
	} else {
		pkg.devDependencies = {
			...(pkg.devDependencies ?? {}),
			...deps,
		}
	}
	writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
}

export function writeGeneratorManifest(opts: ScaffoldOptions): void {
	const manifest = {
		schema: 1,
		generator: '@involvex/ionic-everywhere',
		generatorVersion: generatorVersion(),
		createdAt: new Date().toISOString(),
		options: {
			appName: opts.appName,
			appId: opts.appId,
			nameKebab: opts.nameKebab,
			pm: opts.pm ?? 'npm',
			android: opts.android ?? true,
			electron: opts.electron ?? true,
			tests: opts.tests ?? false,
			layout: opts.layout ?? 'tabs',
			styling: opts.styling ?? 'ionic-css',
			theme: opts.theme ?? 'light-dark',
		},
	}
	writeFileSync(
		join(opts.targetDir, MANIFEST_NAME),
		`${JSON.stringify(manifest, null, 2)}\n`,
	)
}

export function scaffold(opts: ScaffoldOptions): string[] {
	assertEmptyTarget(opts.targetDir)
	cpSync(templateDir(opts.templateVariant), opts.targetDir, {recursive: true})
	applyOverlays(opts.targetDir, opts)
	const written = tokenizeCopiedTree(opts.targetDir, opts)
	const pkgPath = join(opts.targetDir, 'package.json')
	if (opts.pm && opts.pm !== 'npm' && existsSync(pkgPath)) {
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
			scripts?: Record<string, string>
		}
		pkg.scripts = applyRunner(pkg.scripts ?? {}, opts.pm)
		writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
	}
	applyTestingScaffold(opts.targetDir, pkgPath, opts.tests, opts.pm)
	applyStylingScaffold(opts.targetDir, pkgPath, opts.styling)
	writeGeneratorManifest(opts)
	return written
}

export function applyWorkspaces(
	pkgPath: string,
	includeElectron: boolean,
): void {
	const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
		workspaces?: string[]
	}
	const ws = new Set(pkg.workspaces ?? [])
	if (includeElectron) {
		ws.add('electron')
	} else {
		ws.delete('electron')
	}
	if (ws.size > 0) {
		pkg.workspaces = [...ws].sort()
	} else {
		delete pkg.workspaces
	}
	writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
}

/**
 * Pure predicate behind ensureElectronDevToolsHook() — FEAT-029's planner
 * uses it to classify the hook without mutating anything.
 */
export type DevToolsHookState =
	'missing-config' | 'present' | 'skipped-customized' | 'injectable'

export function electronDevToolsHookState(appRoot: string): DevToolsHookState {
	const cfgPath = join(appRoot, 'electron', 'capacitor.electron.config.ts')
	if (!existsSync(cfgPath)) return 'missing-config'
	const original = readFileSync(cfgPath, 'utf8')
	if (/onWindowCreated/.test(original)) return 'present'
	if (/hooks\s*:/.test(original)) return 'skipped-customized'
	return 'injectable'
}

/**
 * Patch the Capawesome-generated electron config so DevTools auto-open while
 * the desktop dev-server mode (`desktop:dev`) is active. The hook is guarded
 * by CAPACITOR_ELECTRON_DEV_SERVER_URL, so production/packaged builds are
 * unaffected. Idempotent; user-customized configs (existing `hooks` block)
 * are left untouched. Returns true when the hook is present afterwards.
 */
export function ensureElectronDevToolsHook(appRoot: string): boolean {
	const cfgPath = join(appRoot, 'electron', 'capacitor.electron.config.ts')
	if (!existsSync(cfgPath)) return false
	const state = electronDevToolsHookState(appRoot)
	if (state !== 'injectable') return state === 'present'
	const original = readFileSync(cfgPath, 'utf8')
	const closer = original.lastIndexOf('});')
	if (closer === -1) return false
	// 2-space indentation matches the platform generator's own output.
	const snippet = [
		'  hooks: {',
		'    onWindowCreated: win => {',
		'      // Auto-open DevTools during desktop dev (ionic-everywhere).',
		'      if (process.env.CAPACITOR_ELECTRON_DEV_SERVER_URL) {',
		"        win.webContents.openDevTools({mode: 'detach'})",
		'      }',
		'    },',
		'  },',
		'',
	].join('\n')
	writeFileSync(
		cfgPath,
		`${original.slice(0, closer)}${snippet}${original.slice(closer)}`,
	)
	return true
}

/**
 * Template-relative (posix) paths of template files ABSENT in targetDir —
 * the copy-if-missing set for FEAT-029. Generator-owned and user-owned files
 * are excluded by construction so an upgrade can never clobber or duplicate
 * them; only additive template files ride along.
 */
const COPY_EXCLUSIONS = new Set([
	MANIFEST_NAME,
	'package.json',
	'package-lock.json',
	'bun.lock',
	'capacitor.config.ts',
	'index.html',
	'vite.config.ts',
	'README.md',
])

const COPY_EXCLUDED_DIRS = new Set([
	'testing',
	'android',
	'electron',
	'assets',
	'public',
	'.git',
	'.vscode',
	'node_modules',
])

export function findMissingTemplateFiles(
	targetDir: string,
	templateRoot: string = templateDir(),
): string[] {
	const missing: string[] = []
	const visit = (dir: string, rel: string): void => {
		for (const entry of readdirSync(dir, {withFileTypes: true})) {
			const relPath = rel ? `${rel}/${entry.name}` : entry.name
			if (entry.isDirectory()) {
				if (!COPY_EXCLUDED_DIRS.has(entry.name))
					visit(join(dir, entry.name), relPath)
			} else if (entry.isFile()) {
				if (COPY_EXCLUSIONS.has(relPath)) continue
				if (!existsSync(join(targetDir, relPath)))
					missing.push(toPosix(relPath))
			}
		}
	}
	visit(templateRoot, '')
	return missing.sort()
}

/**
 * Report-only FEAT-029 scan: files in the project that still contain raw
 * `__APP_*__` tokens (evidence of interrupted tokenization). Never writes.
 */
export function findTokenDrift(targetDir: string): string[] {
	const drift: string[] = []
	for (const path of walkFiles(targetDir)) {
		if (BINARY_EXTS.has(extname(path).toLowerCase())) continue
		let content: string
		try {
			content = readFileSync(path, 'utf8')
		} catch {
			continue
		}
		if (TOKEN_PATTERN.test(content))
			drift.push(toPosix(relative(targetDir, path)))
	}
	return drift.sort()
}
