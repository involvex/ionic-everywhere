import {readFileSync, writeFileSync} from 'node:fs'
import {applyRunner} from './scaffold'

/**
 * Single source of truth for Capacitor platform identifiers (full names —
 * bare `electron` silently resolves to the npm package, see AGENTS.md #3).
 */
export const CAP_PLATFORM_NAMES = {
	android: 'android',
	desktop: '@capawesome/capacitor-electron',
} as const

/**
 * Canonical npm-flavored platform scripts. The template's package.json,
 * prunePlatformScripts() and the `add` command all derive from this registry;
 * tests/scaffold.test.ts guards against drift between them.
 */
export const CANONICAL_SCRIPTS: Record<string, string> = {
	assets: 'npx @capacitor/assets generate --android --assetPath assets',
	android: 'cap run android',
	'android:dev': 'node scripts/android-dev.mjs',
	preandroid: `npm run build && cap sync ${CAP_PLATFORM_NAMES.android}`,
	'open:android': 'cap open android',
	'build:android': `npm run build && cap sync ${CAP_PLATFORM_NAMES.android} && node scripts/gradle.mjs assembleDebug`,
	desktop: 'cd electron && npm run start',
	'desktop:dev': 'node scripts/desktop-dev.mjs',
	predesktop: `npm run build && cap sync ${CAP_PLATFORM_NAMES.desktop}`,
	'build:desktop': `npm run build && cap sync ${CAP_PLATFORM_NAMES.desktop} && cd electron && npm run pack`,
}

const ANDROID_KEYS = [
	'assets',
	'android',
	'android:dev',
	'preandroid',
	'open:android',
	'build:android',
]

const DESKTOP_KEYS = ['desktop', 'desktop:dev', 'predesktop', 'build:desktop']

export function buildSyncScript(android: boolean, electron: boolean): string {
	let sync = 'npm run build'
	if (android) sync += ` && cap sync ${CAP_PLATFORM_NAMES.android}`
	if (electron) sync += ` && cap sync ${CAP_PLATFORM_NAMES.desktop}`
	return sync
}

export function buildBuildAllScript(
	android: boolean,
	electron: boolean,
): string | undefined {
	if (android && electron)
		return 'npm run build:android && npm run build:desktop'
	if (android) return 'npm run build:android'
	if (electron) return 'npm run build:desktop'
	return undefined
}

function readPkg(pkgPath: string): {
	scripts?: Record<string, string>
	[k: string]: unknown
} {
	return JSON.parse(readFileSync(pkgPath, 'utf8'))
}

function writePkg(pkgPath: string, pkg: unknown): void {
	writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
}

/**
 * Pure projection of what syncPlatformScripts() WOULD write: platform-owned
 * keys added/restored from the registry, removed keys dropped, sync/build:all
 * rebuilt, then runner-flavored. FEAT-029's planner diffs against this to
 * report drift without touching disk.
 */
export function computeSyncedScripts(
	current: Record<string, string>,
	android: boolean,
	electron: boolean,
	pm = 'npm',
): Record<string, string> {
	const scripts = {...current}
	const desired: Record<string, string> = {}
	if (android)
		for (const key of ANDROID_KEYS) desired[key] = CANONICAL_SCRIPTS[key]
	if (electron)
		for (const key of DESKTOP_KEYS) desired[key] = CANONICAL_SCRIPTS[key]
	for (const key of [...ANDROID_KEYS, ...DESKTOP_KEYS]) {
		if (key in desired) scripts[key] = desired[key]
		else delete scripts[key]
	}
	scripts['sync'] = buildSyncScript(android, electron)
	const buildAll = buildBuildAllScript(android, electron)
	if (buildAll) scripts['build:all'] = buildAll
	else delete scripts['build:all']
	return applyRunner(scripts, pm)
}

/**
 * Make the project's scripts match the desired platform set: platform-owned
 * keys are added/restored from the registry, removed keys are dropped, and
 * sync/build:all are rebuilt. Unrelated scripts pass through untouched.
 */
export function syncPlatformScripts(
	pkgPath: string,
	android: boolean,
	electron: boolean,
	pm = 'npm',
): void {
	const pkg = readPkg(pkgPath)
	pkg.scripts = computeSyncedScripts(pkg.scripts ?? {}, android, electron, pm)
	writePkg(pkgPath, pkg)
}

/**
 * Legacy pruning behavior used right after scaffolding a reduced-platform
 * project: drop scripts of disabled platforms and trim sync/build:all.
 * With both platforms enabled this is a deliberate no-op — never rewrite
 * user-visible scripts that were not produced by the registry.
 */
export function prunePlatformScripts(
	pkgPath: string,
	android: boolean,
	electron: boolean,
	pm = 'npm',
): void {
	if (android && electron) return
	syncPlatformScripts(pkgPath, android, electron, pm)
}
