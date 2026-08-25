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

const TEXT_FILES = ['package.json', 'capacitor.config.ts', 'index.html']

export function applyTokens(
	content: string,
	opts: Pick<ScaffoldOptions, 'appName' | 'appId' | 'nameKebab'>,
): string {
	return content
		.replaceAll('__APP_NAME__', opts.appName)
		.replaceAll('__APP_ID__', opts.appId)
		.replaceAll('__APP_NAME_KEBAB__', opts.nameKebab)
}

export function applyRunner(
	scripts: Record<string, string>,
	pm?: string,
): Record<string, string> {
	if (!pm || pm === 'npm') return scripts
	const runner = `${pm} run`
	for (const key of Object.keys(scripts)) {
		scripts[key] = scripts[key].replaceAll('npm run', runner)
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

export function prunePlatformScripts(
	pkgPath: string,
	android: boolean,
	electron: boolean,
	pm = 'npm',
): void {
	const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
		scripts?: Record<string, string>
	}
	const scripts = pkg.scripts ?? {}
	if (!android) {
		delete scripts['android']
		delete scripts['preandroid']
		delete scripts['open:android']
		delete scripts['build:android']
	}
	if (!electron) {
		delete scripts['desktop']
		delete scripts['predesktop']
		delete scripts['build:desktop']
	}
	if (!android || !electron) {
		const syncKey = 'sync'
		if (typeof scripts[syncKey] === 'string') {
			let value = scripts[syncKey]
			if (!android) value = value.replace(/\s*&&\s*cap sync android/g, '')
			if (!electron)
				value = value.replace(
					/\s*&&\s*cap sync @capawesome\/capacitor-electron/g,
					'',
				)
			scripts[syncKey] = value.trim()
		}
		if (android && !electron) scripts['build:all'] = `${pm} run build:android`
		else if (!android && electron)
			scripts['build:all'] = `${pm} run build:desktop`
		else delete scripts['build:all']
	}
	pkg.scripts = scripts
	writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
}
