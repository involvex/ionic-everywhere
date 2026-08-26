import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterAll, describe, expect, it} from 'vitest'
import {
	applyWorkspaces,
	generatorVersion,
	MANIFEST_NAME,
	scaffold,
} from '../packages/ionic-everywhere/src/scaffold'
import {
	applyUpgrade,
	compareVersions,
	diffScripts,
	inferProjectOptions,
	planUpgrade,
	type UpgradePlan,
} from '../packages/ionic-everywhere/src/upgrade'

const tempDirs: string[] = []
function makeTemp(prefix = 'ie-upgrade-'): string {
	const dir = mkdtempSync(join(tmpdir(), prefix))
	tempDirs.push(dir)
	return dir
}
afterAll(() => {
	for (const dir of tempDirs) rmSync(dir, {recursive: true, force: true})
})

function scaffoldFixture(): string {
	const target = makeTemp()
	scaffold({
		targetDir: target,
		appName: 'Upgrade App',
		appId: 'io.x.upgrade',
		nameKebab: 'upgrade-app',
		pm: 'bun',
		tests: false,
	})
	// Mirror what runNew does AFTER scaffold(): platform dirs via `cap add`
	// and the electron workspaces pointer. A real upgradable project has both.
	mkdirSync(join(target, 'android'))
	mkdirSync(join(target, 'electron'))
	applyWorkspaces(join(target, 'package.json'), true)
	return target
}

function readPkgJson(root: string): {
	scripts: Record<string, string>
	workspaces?: string[]
} {
	return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
}

describe('compareVersions (FEAT-029)', () => {
	it('orders numeric triples', () => {
		expect(compareVersions('1.2.3', '1.2.3')).toBe(0)
		expect(compareVersions('0.0.1', '9.9.9')).toBe(-1)
		expect(compareVersions('2.0.0', '1.99.99')).toBe(1)
	})

	it('treats prereleases as older than the release', () => {
		expect(compareVersions('1.4.0-canary.1', '1.4.0')).toBe(-1)
		expect(compareVersions('v1.4.1', '1.4.0-beta.2')).toBe(1)
	})
})

describe('inferProjectOptions (FEAT-029 adopt flow)', () => {
	it('reconstructs options from disk artifacts', () => {
		const root = makeTemp()
		writeFileSync(
			join(root, 'package.json'),
			JSON.stringify({
				name: 'legacy-app',
				scripts: {sync: 'bun run build && cap sync android'},
			}),
		)
		writeFileSync(
			join(root, 'capacitor.config.ts'),
			"export default {appId: 'com.example.legacy', appName: 'Legacy App'}",
		)
		const opts = inferProjectOptions(root)
		expect(opts.pm).toBe('bun')
		expect(opts.appId).toBe('com.example.legacy')
		expect(opts.appName).toBe('Legacy App')
		expect(opts.nameKebab).toBe('legacy-app')
		expect(opts.android).toBe(false)
	})

	it('falls back to a derived app id when the config is unreadable', () => {
		const root = makeTemp()
		writeFileSync(
			join(root, 'package.json'),
			JSON.stringify({name: 'fallback-app'}),
		)
		const opts = inferProjectOptions(root)
		expect(opts.appId).toContain('fallback')
		expect(opts.pm).toBe('npm')
	})
})

describe('diffScripts (FEAT-029)', () => {
	it('reports additions, removals and rewrites', () => {
		const changes = diffScripts(
			{keep: 'same', gone: 'old value', changed: 'a'},
			{keep: 'same', added: 'new', changed: 'b'},
		)
		expect(changes.keep).toBeUndefined()
		expect(changes.gone).toEqual({from: 'old value', to: null})
		expect(changes.added).toEqual({from: null, to: 'new'})
		expect(changes.changed).toEqual({from: 'a', to: 'b'})
	})
})

describe('planUpgrade / applyUpgrade (FEAT-029)', () => {
	it('is a no-op on a freshly scaffolded project', () => {
		const target = scaffoldFixture()
		const plan = planUpgrade(target)
		expect(plan.upToDate).toBe(true)
		expect(Object.keys(plan.scriptChanges)).toHaveLength(0)
		expect(plan.filesToCopy).toHaveLength(0)
		expect(plan.versionBump).toBeNull()
	})

	function ageFixture(target: string): void {
		const manifestPath = join(target, MANIFEST_NAME)
		const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
		manifest.generatorVersion = '0.0.1'
		writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
		const pkgPath = join(target, 'package.json')
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
		delete pkg.scripts['open:android']
		writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
		rmSync(join(target, '.prettierrc.json'))
		rmSync(join(target, 'README.md')) // excluded from copy-if-missing
	}

	it('plans restoration of drifted scripts and missing template files', () => {
		const target = scaffoldFixture()
		ageFixture(target)
		const plan: UpgradePlan = planUpgrade(target)
		expect(plan.upToDate).toBe(false)
		expect(plan.versionBump).toEqual({
			from: '0.0.1',
			to: generatorVersion(),
		})
		expect(plan.scriptChanges['open:android']?.to).toContain('cap open android')
		expect(plan.filesToCopy).toContain('.prettierrc.json')
		expect(plan.filesToCopy).not.toContain('README.md')
		for (const rel of plan.filesToCopy)
			expect(rel.startsWith('src/')).toBe(false)
	})

	it('applies the plan: scripts restored, file copied, manifest bumped', () => {
		const target = scaffoldFixture()
		ageFixture(target)
		const plan = planUpgrade(target)
		const result = applyUpgrade(target, plan)

		expect(result.scriptsUpdated).toBeGreaterThan(0)
		expect(result.manifestWritten).toBe(true)
		expect(existsSync(join(target, '.prettierrc.json'))).toBe(true)
		expect(readPkgJson(target).scripts['open:android']).toContain(
			'cap open android',
		)
		const manifest = JSON.parse(
			readFileSync(join(target, MANIFEST_NAME), 'utf8'),
		)
		expect(manifest.generatorVersion).toBe(generatorVersion())
		expect(manifest.options.pm).toBe('bun')
		// README stays untouched by construction
		expect(existsSync(join(target, 'README.md'))).toBe(false)
	})

	it('is idempotent: the follow-up plan is a no-op', () => {
		const target = scaffoldFixture()
		ageFixture(target)
		applyUpgrade(target, planUpgrade(target))
		const second = planUpgrade(target)
		expect(second.upToDate).toBe(true)
		expect(second.filesToCopy).toHaveLength(0)
	})

	it('adopts manifest-less projects and writes a schema-1 manifest', () => {
		const target = scaffoldFixture() // pm: bun -> scripts carry "bun run"
		rmSync(join(target, MANIFEST_NAME))
		const plan = planUpgrade(target)
		expect(plan.upToDate).toBe(false)
		expect(plan.adopt?.inferredOptions.pm).toBe('bun')
		applyUpgrade(target, plan)
		const manifest = JSON.parse(
			readFileSync(join(target, MANIFEST_NAME), 'utf8'),
		)
		expect(manifest.schema).toBe(1)
		expect(manifest.generatorVersion).toBe(generatorVersion())
		expect(manifest.createdAt).toBeTruthy()
	})

	it('adds the electron workspaces pointer when missing', () => {
		const target = makeTemp()
		mkdirSync(join(target, 'electron'))
		writeFileSync(
			join(target, 'package.json'),
			JSON.stringify({name: 'ws-app', scripts: {}}),
		)
		writeFileSync(
			join(target, MANIFEST_NAME),
			JSON.stringify({
				schema: 1,
				generatorVersion: '0.0.1',
				options: {pm: 'npm'},
			}),
		)
		const plan = planUpgrade(target)
		expect(plan.workspaces).toBe('added')
		applyUpgrade(target, plan)
		expect(readPkgJson(target).workspaces).toContain('electron')
	})
})
