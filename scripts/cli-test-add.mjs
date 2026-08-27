import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import {cli, prepareTarget} from './e2e-utils.mjs'

const target = prepareTarget('add-app')

cli(
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
cli(['add', 'desktop', '--dir', target, '--yes', '--pm', 'bun'], 'add desktop')

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
