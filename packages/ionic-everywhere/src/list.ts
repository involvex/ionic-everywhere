import * as p from '@clack/prompts'
import {existsSync, readFileSync} from 'node:fs'
import {isAbsolute, join, resolve} from 'node:path'
import {findProjectRoot} from './add'
import {MANIFEST_NAME} from './scaffold'

export interface ListOptions {
	projectDir?: string
	json?: boolean
}

/**
 * Shape of `.ionic-everywhere.json` written by FEAT-022. Kept permissive:
 * unknown fields pass through so newer generators can extend the schema
 * without breaking older CLIs.
 */
export interface GeneratorManifest {
	schema?: number
	generator?: string
	generatorVersion?: string
	createdAt?: string
	updatedAt?: string
	options?: Record<string, unknown>
}

export type ManifestRead =
	| {state: 'ok'; manifest: GeneratorManifest}
	| {state: 'missing'}
	| {state: 'malformed'; reason: string}

export function readManifest(root: string): ManifestRead {
	const path = join(root, MANIFEST_NAME)
	if (!existsSync(path)) return {state: 'missing'}
	try {
		const parsed = JSON.parse(readFileSync(path, 'utf8')) as GeneratorManifest
		if (
			typeof parsed !== 'object' ||
			parsed === null ||
			Array.isArray(parsed)
		) {
			return {state: 'malformed', reason: `${MANIFEST_NAME} is not an object`}
		}
		return {state: 'ok', manifest: parsed}
	} catch (err) {
		return {
			state: 'malformed',
			reason: err instanceof Error ? err.message : String(err),
		}
	}
}

export function platformDirsPresent(root: string): string[] {
	return ['android', 'electron'].filter(d => existsSync(join(root, d)))
}

export function formatProjectReport(
	root: string,
	manifest: GeneratorManifest,
): string {
	const opts = manifest.options ?? {}
	const lines = [
		`Project          : ${root}`,
		`Generator        : ${manifest.generator ?? 'unknown'}`,
		`Generator version: ${manifest.generatorVersion ?? 'unknown'}${
			manifest.schema !== undefined ? ` (schema ${manifest.schema})` : ''
		}`,
	]
	if (manifest.createdAt) lines.push(`Created          : ${manifest.createdAt}`)
	if (manifest.updatedAt) lines.push(`Updated          : ${manifest.updatedAt}`)
	for (const key of [
		'appName',
		'appId',
		'nameKebab',
		'pm',
		'android',
		'electron',
		'tests',
	]) {
		if (key in opts) lines.push(`${key.padEnd(17)}: ${String(opts[key])}`)
	}
	lines.push(
		`Platform dirs    : ${platformDirsPresent(root).join(', ') || 'none'}`,
	)
	return lines.join('\n')
}

export async function runList(opts: ListOptions): Promise<number> {
	let dir: string | undefined
	if (opts.projectDir !== undefined) {
		dir = isAbsolute(opts.projectDir)
			? opts.projectDir
			: resolve(process.cwd(), opts.projectDir)
		if (!existsSync(join(dir, 'capacitor.config.ts'))) {
			p.log.error(
				`No capacitor.config.ts in ${dir}. This does not look like an ionic-everywhere project.`,
			)
			return 1
		}
	} else {
		dir = findProjectRoot(process.cwd())
		if (!dir) {
			p.log.error(
				'No capacitor.config.ts found in this directory or any parent. Run inside an ionic-everywhere project or pass --dir <path>.',
			)
			return 1
		}
	}

	const read = readManifest(dir)
	if (read.state === 'ok') {
		if (opts.json) console.log(JSON.stringify(read.manifest, null, 2))
		else console.log(formatProjectReport(dir, read.manifest))
		return 0
	}

	const dirs = platformDirsPresent(dir)
	if (read.state === 'missing') {
		p.log.warn(
			`${MANIFEST_NAME} not found - this project was created before the generator recorded one (FEAT-022).`,
		)
		console.log(`Platform dirs      : ${dirs.join(', ') || 'none'}`)
		return 0
	}

	p.log.error(`Could not parse ${MANIFEST_NAME}: ${read.reason}`)
	return 1
}
