import {spawnSync} from 'node:child_process'
import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import {cli, cliResult, cliStdout, prepareTarget} from './e2e-utils.mjs'

const target = prepareTarget('demo-app')

cli(['new', target, '--yes', '--pm', 'bun', '--no-git'], 'scaffold')

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
	'android:dev',
	'preandroid',
	'desktop',
	'desktop:dev',
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

// FEAT-034: exercise the `list` command end-to-end against the fresh project.
const listed = cliStdout(['list', '--dir', target, '--json'], 'list --json')
let manifest
try {
	manifest = JSON.parse(listed)
} catch {
	manifest = undefined
}
if (!manifest || manifest?.generator !== '@involvex/ionic-everywhere') {
	console.error(
		`cli:test FAILED - "list --json" did not return the generator manifest: ${listed}`,
	)
	process.exit(1)
}

// Validate the `ine` alias is present in completions output.
const psCompletions = cliStdout(
	['completions', 'powershell'],
	'completions powershell',
)
if (!psCompletions.includes('ine')) {
	console.error(
		`cli:test FAILED - PowerShell completions did not mention "ine": ${psCompletions.slice(0, 200)}`,
	)
	process.exit(1)
}

// FEAT-027: actually building the scaffolded app catches dependency-drift
// incidents early (skipped native optionals, missing transitive packages,
// broken hoisting) before users ever see them.
const webBuild = spawnSync(process.execPath, ['run', 'build'], {
	cwd: target,
	stdio: 'inherit',
})
if (webBuild.status !== 0) {
	console.error('cli:test FAILED - web build of the scaffolded app failed')
	process.exit(webBuild.status ?? 1)
}

// Exercise the `sign` command end-to-end against the fresh project. A real
// release build needs an Android SDK + keystore, so we assert the validation
// paths: missing flags with --yes fail loudly, an unknown --pm fails, and a
// nonexistent keystore path fails. These guard the flag wiring in cli.ts.
const signMissing = cliResult([
	'sign',
	'--dir',
	target,
	'--yes',
	'--no-install',
])
if (signMissing.status === 0) {
	console.error(
		'cli:test FAILED - "sign --yes" without keystore flags succeeded unexpectedly',
	)
	process.exit(1)
}
if (
	!`${signMissing.stdout}${signMissing.stderr}`.includes(
		'Missing required signing options',
	)
) {
	console.error(
		`cli:test FAILED - "sign --yes" error did not list missing options:\n${signMissing.stdout}\n${signMissing.stderr}`,
	)
	process.exit(1)
}

const signBadPm = cliResult(['sign', '--dir', target, '--yes', '--pm', 'nope'])
if (
	signBadPm.status === 0 ||
	!`${signBadPm.stdout}${signBadPm.stderr}`.includes('Unsupported --pm')
) {
	console.error(
		`cli:test FAILED - "sign --pm nope" did not reject the PM:\n${signBadPm.stdout}\n${signBadPm.stderr}`,
	)
	process.exit(1)
}

const signBadKeystore = cliResult([
	'sign',
	'--dir',
	target,
	'--yes',
	'--no-install',
	'--keystore',
	'does-not-exist.jks',
	'--store-pass',
	'secret',
	'--key-alias',
	'release',
])
if (
	signBadKeystore.status === 0 ||
	!`${signBadKeystore.stdout}${signBadKeystore.stderr}`.includes(
		'Keystore file not found',
	)
) {
	console.error(
		`cli:test FAILED - nonexistent keystore was not rejected:\n${signBadKeystore.stdout}\n${signBadKeystore.stderr}`,
	)
	process.exit(1)
}

console.log(
	'cli:test OK - scaffolded web + android + desktop into .test/demo-app',
)
