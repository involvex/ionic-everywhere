import {spawnSync} from 'node:child_process'
import {existsSync, readFileSync, rmSync} from 'node:fs'
import {join} from 'node:path'

const target = '.test/demo-app'

rmSync('.test', {recursive: true, force: true})

const result = spawnSync(
	process.execPath,
	[
		'packages/ionic-everywhere/dist/cli.js',
		'new',
		target,
		'--yes',
		'--pm',
		'bun',
		'--no-git',
	],
	{stdio: 'inherit'},
)

if (result.status !== 0) {
	console.error('cli:test FAILED - scaffold command exited non-zero')
	process.exit(result.status ?? 1)
}

const expected = [
	join(target, 'package.json'),
	join(target, 'src', 'App.tsx'),
	join(target, 'android'),
	join(target, 'electron'),
	join(target, 'node_modules'),
]

const missing = expected.filter(p => !existsSync(p))
if (missing.length > 0) {
	console.error(`cli:test FAILED - missing: ${missing.join(', ')}`)
	process.exit(1)
}

const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'))
for (const script of [
	'android',
	'preandroid',
	'desktop',
	'predesktop',
	'lint',
	'typecheck',
	'format',
]) {
	if (!pkg.scripts[script]) {
		console.error(`cli:test FAILED - missing script: ${script}`)
		process.exit(1)
	}
}
if (!pkg.scripts.sync.startsWith('bun run build')) {
	console.error(
		`cli:test FAILED - scripts not bun-injected: sync = ${pkg.scripts.sync}`,
	)
	process.exit(1)
}
if (!Array.isArray(pkg.workspaces) || !pkg.workspaces.includes('electron')) {
	console.error(
		`cli:test FAILED - electron workspace missing: ${JSON.stringify(pkg.workspaces)}`,
	)
	process.exit(1)
}
if (existsSync(join(target, 'electron', 'bun.lock'))) {
	console.error(
		'cli:test FAILED - electron/bun.lock exists, installs are not workspace-consolidated',
	)
	process.exit(1)
}

console.log(
	'cli:test OK - scaffolded web + android + desktop into .test/demo-app',
)
