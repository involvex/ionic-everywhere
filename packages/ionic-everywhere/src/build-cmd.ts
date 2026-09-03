import * as p from '@clack/prompts'
import {existsSync, readFileSync} from 'node:fs'
import {isAbsolute, join, resolve} from 'node:path'
import {findProjectRoot} from './add'
import {runStreaming} from './run'
import {detectPm, isValidPm, pmRun, VALID_PMS} from './util'

export interface BuildOptions {
	projectDir?: string
	pm?: string
	platform?: string
}

function die(msg: string): never {
	p.log.error(msg)
	process.exit(1)
}

export type PlatformTarget = 'all' | 'android' | 'desktop' | 'web'

export function normalizePlatform(value?: string): PlatformTarget | undefined {
	if (!value) return 'all'
	const v = value.trim().toLowerCase()
	if (v === 'all' || v === '') return 'all'
	if (v === 'android') return 'android'
	if (v === 'desktop' || v === 'electron') return 'desktop'
	if (v === 'web') return 'web'
	return undefined
}

export async function runBuild(opts: BuildOptions): Promise<number> {
	if (opts.pm !== undefined && !isValidPm(opts.pm)) {
		die(`Unsupported --pm "${opts.pm}". Choose one of: ${VALID_PMS.join(', ')}`)
	}
	const pm = opts.pm ?? detectPm()

	const targetPlatform = normalizePlatform(opts.platform)
	if (!targetPlatform) {
		die(
			`Unknown platform "${opts.platform ?? ''}". Usage: ionic-everywhere build [--platform <all|android|desktop|web>]`,
		)
	}

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
	}

	const pkgPath = join(dir, 'package.json')
	if (!existsSync(pkgPath)) {
		die(`No package.json in ${dir}. Run inside an ionic-everywhere project.`)
	}

	const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
		scripts?: Record<string, string>
	}
	const scripts = pkg.scripts ?? {}

	let scriptToRun: string
	if (targetPlatform === 'android') {
		scriptToRun = scripts['build:android'] ? 'build:android' : 'build'
	} else if (targetPlatform === 'desktop') {
		scriptToRun = scripts['build:desktop'] ? 'build:desktop' : 'build'
	} else if (targetPlatform === 'web') {
		scriptToRun = 'build'
	} else {
		scriptToRun = scripts['build:all'] ? 'build:all' : 'build'
	}

	if (!scripts[scriptToRun]) {
		die(`Script "${scriptToRun}" not found in package.json.`)
	}

	p.intro(`ionic-everywhere - building (${targetPlatform})`)
	p.log.info(`Project: ${dir}`)
	p.log.info(`PM     : ${pm}`)
	p.log.info(`Script : ${scriptToRun}`)

	const cmd = `${pmRun(pm)} ${scriptToRun}`
	const result = await runStreaming(cmd, dir, {
		onLine: line => {
			console.log(line)
		},
	})

	if (result.code !== 0) {
		p.log.error(`Build failed with code ${result.code}`)
		return result.code ?? 1
	}

	p.outro('Build successful!')
	return 0
}
