import {existsSync, readdirSync, rmSync} from 'node:fs'
import {join} from 'node:path'

// Removes output produced by `cli:test` / `scripts/cli-test-*.mjs`.
// Best-effort on Windows: a previous run's demo-app can be held open (e.g.
// as some process's cwd); we prune what we can instead of failing hard.
const BASE = '.test'

if (!existsSync(BASE)) {
	console.log(`nothing to clean (${BASE}/ does not exist)`)
} else {
	try {
		rmSync(BASE, {recursive: true, force: true})
		console.log(`removed ${BASE}/`)
	} catch {
		let removed = 0
		for (const entry of readdirSafe(BASE)) {
			try {
				rmSync(join(BASE, entry), {recursive: true, force: true})
				removed++
			} catch {
				console.warn(`could not remove ${join(BASE, entry)} (locked?)`)
			}
		}
		console.log(
			`pruned ${removed} entr${removed === 1 ? 'y' : 'ies'} from ${BASE}/`,
		)
	}
}

function readdirSafe(dir) {
	try {
		return readdirSync(dir)
	} catch {
		return []
	}
}
