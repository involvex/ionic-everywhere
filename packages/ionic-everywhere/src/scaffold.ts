import {
	cpSync,
	existsSync,
	readFileSync,
	readdirSync,
	writeFileSync,
} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

export interface ScaffoldOptions {
	targetDir: string
	appName: string
	appId: string
	nameKebab: string
	pm?: string
}

export function templateDir(): string {
	return join(
		dirname(fileURLToPath(import.meta.url)),
		'..',
		'templates',
		'default',
	)
}

const TEXT_FILES = [
	'package.json',
	'capacitor.config.ts',
	'index.html',
	'vite.config.ts',
]

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
	if (!pm || pm === 'npm') return scripts
	const runner = `${pm} run`
	const dlx = PM_DLX[pm]
	for (const key of Object.keys(scripts)) {
		let value = scripts[key].replaceAll('npm run', runner)
		// Rewrite npx only in invoker position (start of value or after a chain
		// segment), never inside arbitrary arguments like `echo npx foo`.
		if (dlx) value = value.replace(/(^|&&\s*)npx\s/g, `$1${dlx} `)
		scripts[key] = value
	}
	return scripts
}

export function assertEmptyTarget(targetDir: string): void {
	if (!existsSync(targetDir)) return
	const entries = readdirSync(targetDir)
	if (entries.length > 0) {
		throw new Error(`Target directory is not empty: ${targetDir}`)
	}
}

export function scaffold(opts: ScaffoldOptions): string[] {
	assertEmptyTarget(opts.targetDir)
	cpSync(templateDir(), opts.targetDir, {recursive: true})
	const written: string[] = []
	for (const file of TEXT_FILES) {
		const path = join(opts.targetDir, file)
		if (!existsSync(path)) continue
		writeFileSync(path, applyTokens(readFileSync(path, 'utf8'), opts))
		written.push(file)
	}
	const pkgPath = join(opts.targetDir, 'package.json')
	if (opts.pm && opts.pm !== 'npm' && existsSync(pkgPath)) {
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
			scripts?: Record<string, string>
		}
		pkg.scripts = applyRunner(pkg.scripts ?? {}, opts.pm)
		writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
	}
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
