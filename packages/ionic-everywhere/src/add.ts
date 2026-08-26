import * as p from '@clack/prompts'
import {existsSync} from 'node:fs'
import {dirname, isAbsolute, join, resolve} from 'node:path'
import {CAP_PLATFORM_NAMES, syncPlatformScripts} from './platform-scripts'
import {applyWorkspaces, ensureElectronDevToolsHook} from './scaffold'
import {step} from './step'
import {detectPm, isValidPm, pmInstall, pmRun, VALID_PMS} from './util'

export interface AddOptions {
	platform?: string
	projectDir?: string
	pm?: string
	install: boolean
	yes: boolean
}

const PLATFORMS = {
	android: {
		dir: 'android',
		label: 'Android',
		capName: CAP_PLATFORM_NAMES.android,
	},
	desktop: {
		dir: 'electron',
		label: 'Desktop (Electron)',
		capName: CAP_PLATFORM_NAMES.desktop,
	},
} as const

type PlatformKey = keyof typeof PLATFORMS

export function normalizePlatformArg(value?: string): PlatformKey | undefined {
	const v = (value ?? '').trim().toLowerCase()
	if (v === 'android') return 'android'
	if (v === 'desktop' || v === 'electron') return 'desktop'
	return undefined
}

/**
 * Walk up from startDir until a capacitor.config.ts marker is found
 * (FEAT-028). Returns undefined at the filesystem root. Explicit --dir
 * values skip this walk — the caller decided where the project lives.
 */
export function findProjectRoot(startDir: string): string | undefined {
	let current = resolve(startDir)
	for (;;) {
		if (existsSync(join(current, 'capacitor.config.ts'))) return current
		const parent = dirname(current)
		if (parent === current) return undefined
		current = parent
	}
}

function die(msg: string): never {
	p.log.error(msg)
	process.exit(1)
}

export async function runAdd(opts: AddOptions): Promise<number> {
	const platform = normalizePlatformArg(opts.platform)
	if (!platform) {
		die(
			`Unknown platform "${opts.platform ?? ''}". Usage: ionic-everywhere add <android|desktop>`,
		)
	}
	if (opts.pm !== undefined && !isValidPm(opts.pm)) {
		die(`Unsupported --pm "${opts.pm}". Choose one of: ${VALID_PMS.join(', ')}`)
	}
	const pm = opts.pm ?? detectPm()

	let dir: string
	if (opts.projectDir !== undefined) {
		dir = isAbsolute(opts.projectDir)
			? opts.projectDir
			: resolve(process.cwd(), opts.projectDir)
	} else {
		const found = findProjectRoot(process.cwd())
		if (!found) {
			die(
				'No capacitor.config.ts found in this directory or any parent. Run inside an ionic-everywhere project or pass --dir <path>.',
			)
		}
		dir = found
		if (dir !== process.cwd()) p.log.info(`Found project root: ${dir}`)
	}
	const pkgPath = join(dir, 'package.json')
	if (!existsSync(pkgPath)) {
		die(`No package.json in ${dir}. Run inside an ionic-everywhere project.`)
	}
	if (!existsSync(join(dir, 'capacitor.config.ts'))) {
		die(
			`No capacitor.config.ts in ${dir}. This does not look like an ionic-everywhere project.`,
		)
	}

	const spec = PLATFORMS[platform]
	if (existsSync(join(dir, spec.dir))) {
		die(
			`${spec.label} platform already present (${spec.dir}/). Nothing to add.`,
		)
	}

	p.intro(`ionic-everywhere - adding ${spec.label}`)
	p.log.info(`Project: ${dir}`)
	p.log.info(`PM     : ${pm}`)

	const s = p.spinner()
	const hadAndroid = existsSync(join(dir, 'android'))

	if (
		opts.install &&
		!existsSync(join(dir, 'node_modules')) &&
		!(await step(
			s,
			{
				start: `Installing dependencies (${pm})`,
				ok: 'Dependencies installed',
				fail: 'Install failed',
			},
			pmInstall(pm),
			dir,
		))
	)
		return 1

	if (
		!(await step(
			s,
			{
				start: `Adding ${spec.label} platform`,
				ok: `${spec.dir}/ created`,
				fail: `cap add ${spec.capName} failed`,
			},
			`${pmRun(pm)} cap add ${spec.capName}`,
			dir,
		))
	)
		return 1

	const hadElectron =
		platform === 'desktop' || existsSync(join(dir, 'electron'))
	const hadAndroidFinal = platform === 'android' || hadAndroid

	if (platform === 'desktop') {
		applyWorkspaces(pkgPath, true)
		ensureElectronDevToolsHook(dir)
		if (
			opts.install &&
			!(await step(
				s,
				{
					start: 'Installing electron deps (workspace root)',
					ok: 'Dependencies installed',
					fail: 'Electron workspace install failed',
				},
				pmInstall(pm),
				dir,
			))
		)
			return 1
	}

	syncPlatformScripts(pkgPath, hadAndroidFinal, hadElectron, pm)

	p.outro(
		[
			'',
			`${spec.label} platform added.`,
			...(platform === 'android'
				? [
						`  ${pm} run android        # run on device/emulator (auto build+sync)`,
						`  ${pm} run build:android # debug APK`,
					]
				: [
						`  ${pm} run desktop        # open desktop app (auto build+sync)`,
						`  ${pm} run desktop:dev   # vite + electron, hot reload + DevTools`,
						`  ${pm} run build:desktop # installer/portable`,
					]),
		].join('\n'),
	)
	return 0
}
