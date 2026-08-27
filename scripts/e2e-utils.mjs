import {spawnSync} from 'node:child_process'
import {mkdirSync, readdirSync, rmSync} from 'node:fs'
import {join} from 'node:path'

const BASE = '.test'

/**
 * Prepare a unique timestamped target directory under `.test/`.
 * Prunes stale directories from previous runs (best-effort on Windows).
 */
export function prepareTarget(prefix) {
	try {
		rmSync(BASE, {recursive: true, force: true})
	} catch {
		// locked by another process; fall through and prune what we can
	}
	mkdirSync(BASE, {recursive: true})
	for (const entry of readdirSync(BASE)) {
		try {
			rmSync(join(BASE, entry), {recursive: true, force: true})
		} catch {
			// still locked; leave it
		}
	}
	const stamp = `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}-${Math.random().toString(36).slice(2, 7)}`
	return join(BASE, `${prefix}-${stamp}`)
}

/** Run the CLI with the given args, inheriting stdio. Exits on failure. */
export function cli(args, label, opts = {}) {
	const result = spawnSync(
		process.execPath,
		['packages/ionic-everywhere/dist/cli.js', ...args],
		{stdio: 'inherit', ...opts},
	)
	if (result.status !== 0) {
		console.error(`FAILED - ${label} exited non-zero`)
		process.exit(result.status ?? 1)
	}
	return result
}

/** Run the CLI and return the raw spawnSync result (no auto-exit). */
export function cliResult(args) {
	return spawnSync(
		process.execPath,
		['packages/ionic-everywhere/dist/cli.js', ...args],
		{encoding: 'utf8'},
	)
}

/** Run the CLI and return stdout as a string. Exits on failure. */
export function cliStdout(args, label) {
	const result = spawnSync(
		process.execPath,
		['packages/ionic-everywhere/dist/cli.js', ...args],
		{encoding: 'utf8'},
	)
	if (result.status !== 0) {
		console.error(`FAILED - ${label} exited non-zero`)
		process.exit(result.status ?? 1)
	}
	return result.stdout
}
