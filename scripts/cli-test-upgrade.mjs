import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import {join} from 'node:path'
import {cli, cliResult, prepareTarget} from './e2e-utils.mjs'

// FEAT-029 end-to-end: scaffold -> age the project -> `upgrade --yes` ->
// assert restoration. Runs without installs so it stays fast in CI; platform
// dirs are materialized the way `cap add` would have left them.
const target = prepareTarget('upgrade-app')

cli(
	['new', target, '--yes', '--pm', 'bun', '--no-git', '--no-install'],
	'scaffold',
)

// Post-scaffold state that `new` normally creates during `cap add`.
mkdirSync(join(target, 'android'))
mkdirSync(join(target, 'electron'))

const manifestPath = join(target, '.ionic-everywhere.json')
function readManifestJson() {
	return JSON.parse(readFileSync(manifestPath, 'utf8'))
}

// Age the project: old generator version, dropped script, removed template file.
{
	const manifest = readManifestJson()
	manifest.generatorVersion = '0.0.1'
	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
	const pkgPath = join(target, 'package.json')
	const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
	delete pkg.scripts['open:android']
	writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
	rmSync(join(target, '.prettierrc.json'))
}

// Dry-run must not mutate anything.
const dry = cliResult(['upgrade', '--dir', target, '--dry-run'])
if (
	dry.status !== 0 ||
	existsSync(join(target, '.prettierrc.json')) ||
	!readManifestJson().generatorVersion.startsWith('0.0.1')
) {
	console.error(
		`cli-test-upgrade FAILED - dry-run mutated the project or errored:\n${dry.stdout}\n${dry.stderr}`,
	)
	process.exit(1)
}

cli(['upgrade', '--dir', target, '--yes'], 'upgrade')

const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'))
if (!pkg.scripts['open:android']?.includes('cap open android')) {
	console.error(
		`cli-test-upgrade FAILED - open:android not restored: ${pkg.scripts['open:android']}`,
	)
	process.exit(1)
}
if (!existsSync(join(target, '.prettierrc.json'))) {
	console.error('cli-test-upgrade FAILED - .prettierrc.json not restored')
	process.exit(1)
}
const cliVersion = JSON.parse(
	readFileSync('packages/ionic-everywhere/package.json', 'utf8'),
).version
if (readManifestJson().generatorVersion !== cliVersion) {
	console.error(
		`cli-test-upgrade FAILED - manifest not bumped to ${cliVersion}: ${readManifestJson().generatorVersion}`,
	)
	process.exit(1)
}
if (!Array.isArray(pkg.workspaces) || !pkg.workspaces.includes('electron')) {
	console.error(
		`cli-test-upgrade FAILED - electron workspaces pointer not added`,
	)
	process.exit(1)
}

// Idempotency: a second run must report "already up to date" and exit 0.
const second = cliResult(['upgrade', '--dir', target, '--yes'])
if (
	second.status !== 0 ||
	!`${second.stdout}${second.stderr}`.includes('Already up to date')
) {
	console.error(
		`cli-test-upgrade FAILED - second upgrade was not a reported no-op:\n${second.stdout}\n${second.stderr}`,
	)
	process.exit(1)
}

console.log(
	'cli-test-upgrade OK - aged project upgraded: scripts restored, template file re-copied, manifest bumped',
)
