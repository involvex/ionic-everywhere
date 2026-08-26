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
	/** Opt-in Vitest testing scaffold (FEAT-012). */
	tests?: boolean
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

export function templateDir(): string {
	return join(
		dirname(fileURLToPath(import.meta.url)),
		'..',
		'templates',
		'default',
	)
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
	opts: Pick<ScaffoldOptions, 'appName' | 'appId' | 'nameKebab'>,
): string {
	return content
		.replaceAll('__APP_NAME__', opts.appName)
		.replaceAll('__APP_ID__', opts.appId)
		.replaceAll('__APP_NAME_KEBAB__', opts.nameKebab)
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

function walkFiles(root: string): string[] {
	const out: string[] = []
	const visit = (dir: string): void => {
		for (const entry of readdirSync(dir, {withFileTypes: true})) {
			const full = join(dir, entry.name)
			if (entry.isDirectory()) visit(full)
			else if (entry.isFile()) out.push(full)
		}
	}
	visit(root)
	return out
}

/**
 * Rewrite every copied file that still carries `__APP_*__` tokens. Files are
 * discovered by content (not a hardcoded list) so new tokenized template files
 * cannot be forgotten; binary extensions are skipped.
 */
export function tokenizeCopiedTree(
	targetDir: string,
	opts: Pick<ScaffoldOptions, 'appName' | 'appId' | 'nameKebab'>,
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

export function scaffold(opts: ScaffoldOptions): string[] {
	assertEmptyTarget(opts.targetDir)
	cpSync(templateDir(), opts.targetDir, {recursive: true})
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
 * Patch the Capawesome-generated electron config so DevTools auto-open while
 * the desktop dev-server mode (`desktop:dev`) is active. The hook is guarded
 * by CAPACITOR_ELECTRON_DEV_SERVER_URL, so production/packaged builds are
 * unaffected. Idempotent; user-customized configs (existing `hooks` block)
 * are left untouched. Returns true when the hook is present afterwards.
 */
export function ensureElectronDevToolsHook(appRoot: string): boolean {
	const cfgPath = join(appRoot, 'electron', 'capacitor.electron.config.ts')
	if (!existsSync(cfgPath)) return false
	const original = readFileSync(cfgPath, 'utf8')
	if (/onWindowCreated/.test(original)) return true
	if (/hooks\s*:/.test(original)) return false
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
