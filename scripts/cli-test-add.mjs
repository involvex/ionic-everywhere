import {spawnSync} from 'node:child_process'
import {existsSync, mkdirSync, readFileSync, readdirSync, rmSync} from 'node:fs'
import {join} from 'node:path'

// Windows-safe unique target (see cli-test.mjs note).
const base = '.test'
try {
	rmSync(base, {recursive: true, force: true})
} catch {
	// locked by another process; fall through and prune what we can
}
mkdirSync(base, {recursive: true})
for (const entry of readdirSync(base)) {
	try {
		rmSync(join(base, entry), {recursive: true, force: true})
	} catch {
		// still locked; leave it
	}
}
const stamp = `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}-${Math.random().toString(36).slice(2, 7)}`
const target = join(base, `add-app-${stamp}`)

function run(args, label) {
	const result = spawnSync(
		process.execPath,
		['packages/ionic-everywhere/dist/cli.js', ...args],
		{stdio: 'inherit'},
	)
	if (result.status !== 0) {
		console.error(`cli:add FAILED - ${label} exited non-zero`)
		process.exit(result.status ?? 1)
	}
}

run(
	[
		'new',
		target,
		'--yes',
		'--pm',
		'bun',
		'--no-git',
		'--no-electron',
		'--no-install',
	],
	'scaffold without electron',
)

if (existsSync(join(target, 'electron'))) {
	console.error('cli:add FAILED - electron/ should not exist before add')
	process.exit(1)
}

let pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'))
for (const script of ['desktop', 'predesktop', 'build:desktop']) {
	if (pkg.scripts[script]) {
		console.error(`cli:add FAILED - ${script} should be pruned before add`)
		process.exit(1)
	}
}
if (pkg.scripts.sync.includes('@capawesome/capacitor-electron')) {
	console.error('cli:add FAILED - sync should not mention electron yet')
	process.exit(1)
}

// Installs deps, runs cap add, applies workspaces, restores scripts.
run(['add', 'desktop', '--dir', target, '--yes', '--pm', 'bun'], 'add desktop')

if (!existsSync(join(target, 'electron'))) {
	console.error('cli:add FAILED - electron/ missing after add')
	process.exit(1)
}

pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'))
for (const script of ['desktop', 'predesktop', 'build:desktop']) {
	if (!pkg.scripts[script]) {
		console.error(`cli:add FAILED - ${script} not restored`)
		process.exit(1)
	}
}
if (!pkg.scripts.sync.includes('@capawesome/capacitor-electron')) {
	console.error('cli:add FAILED - sync missing electron fragment after add')
	process.exit(1)
}
if (!pkg.scripts['build:all'].includes('build:desktop')) {
	console.error('cli:add FAILED - build:all not rebuilt')
	process.exit(1)
}
if (!Array.isArray(pkg.workspaces) || !pkg.workspaces.includes('electron')) {
	console.error('cli:add FAILED - electron workspace not applied')
	process.exit(1)
}

console.log('cli:add OK - scaffolded web+android, then added desktop in place')
