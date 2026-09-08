import * as p from '@clack/prompts'
import {spawnSync} from 'node:child_process'
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from 'node:fs'
import {basename, dirname, isAbsolute, join, resolve} from 'node:path'
import {findProjectRoot} from './add'
import {BLESSED_DEPS, type DepChange, type DepKind} from './cap-versions'
import {readManifest, type GeneratorManifest} from './list'
import {computeSyncedScripts, syncPlatformScripts} from './platform-scripts'
import {
	applyTokens,
	applyWorkspaces,
	electronDevToolsHookState,
	ensureElectronDevToolsHook,
	findMissingTemplateFiles,
	findTokenDrift,
	generatorVersion,
	MANIFEST_NAME,
	templateDir,
} from './scaffold'
import {renderMajorAdvisory} from './upgrade-advisory'
import {
	deriveAppId,
	isInteractive,
	isValidPm,
	pmInstall,
	pmRun,
	toTitle,
} from './util'

export interface UpgradeOptions {
	projectDir?: string
	pm?: string
	dryRun?: boolean
	force?: boolean
	yes?: boolean
	checkDeps?: boolean
	deps?: boolean
	allowDirty?: boolean
}

export interface ManifestOptions {
	appName: string
	appId: string
	nameKebab: string
	pm: string
	android: boolean
	electron: boolean
	tests: boolean
}

export type ScriptChange = {from: string | null; to: string | null}

export interface UpgradePlan {
	upToDate: boolean
	options: ManifestOptions
	adopt?: {inferredOptions: ManifestOptions}
	scriptChanges: Record<string, ScriptChange>
	workspaces: 'added' | 'unchanged'
	devtoolsHook:
		'injectable' | 'present' | 'skipped-customized' | 'not-applicable'
	filesToCopy: string[]
	tokenDrift: string[]
	versionBump: {from: string; to: string} | null
	previousCreatedAt?: string
	depChanges: DepChange[]
	majorAdvisory: DepChange[]
	syncNeeded: boolean
}

/**
 * Hand-rolled semver comparison (no deps): numeric triple order first, then
 * stable > prerelease, prerelease strings compared lexically. Enough for
 * generator-version gating; real range math is out of scope.
 */
export function compareVersions(a: string, b: string): number {
	const parse = (v: string): {nums: number[]; pre: string | null} => {
		const clean = v.replace(/^v/, '').trim()
		const hyphen = clean.indexOf('-')
		const core = hyphen === -1 ? clean : clean.slice(0, hyphen)
		const pre = hyphen === -1 ? null : clean.slice(hyphen + 1)
		const nums = core.split('.').map(n => Number.parseInt(n, 10) || 0)
		return {nums, pre}
	}
	const left = parse(a)
	const right = parse(b)
	const len = Math.max(left.nums.length, right.nums.length)
	for (let i = 0; i < len; i++) {
		const x = left.nums[i] ?? 0
		const y = right.nums[i] ?? 0
		if (x !== y) return x < y ? -1 : 1
	}
	if (left.pre && !right.pre) return -1
	if (!left.pre && right.pre) return 1
	if (left.pre && right.pre)
		return left.pre < right.pre ? -1 : left.pre > right.pre ? 1 : 0
	return 0
}

const PM_HINTS: [RegExp, string][] = [
	[/\bbun (run|x)\b/, 'bun'],
	[/\bpnpm\b/, 'pnpm'],
	[/\byarn\b/, 'yarn'],
]

interface PkgShape {
	name?: string
	scripts?: Record<string, string>
	workspaces?: unknown
	devDependencies?: Record<string, unknown>
}

function readPkg(root: string): PkgShape {
	return JSON.parse(
		readFileSync(join(root, 'package.json'), 'utf8'),
	) as PkgShape
}

/**
 * Adopt-flow inference (FEAT-029): reconstruct manifest options purely from
 * what is on disk — capacitor.config.ts ids, script runner flavor, platform
 * dirs, vitest presence. Idempotent by construction.
 */
export function inferProjectOptions(root: string): ManifestOptions {
	const pkg = readPkg(root)
	const kebab = (
		pkg.name || basename(root).replace(/\s+/g, '-').toLowerCase()
	).toLowerCase()
	let appId = ''
	let appName = ''
	const cfgPath = join(root, 'capacitor.config.ts')
	if (existsSync(cfgPath)) {
		const cfg = readFileSync(cfgPath, 'utf8')
		appId = /appId\s*:\s*['"]([^'"]+)['"]/.exec(cfg)?.[1] ?? ''
		appName = /appName\s*:\s*['"]([^'"]+)['"]/.exec(cfg)?.[1] ?? ''
	}
	if (!/^([a-z][a-z0-9_]*)(\.[a-z][a-z0-9_]*)+$/.test(appId))
		appId = deriveAppId(kebab)
	if (!appName) appName = toTitle(kebab)
	const scriptValues = Object.values(pkg.scripts ?? {})
	let pm = 'npm'
	for (const [re, name] of PM_HINTS) {
		if (scriptValues.some(v => re.test(v))) {
			pm = name
			break
		}
	}
	return {
		appName,
		appId,
		nameKebab: kebab,
		pm,
		android: existsSync(join(root, 'android')),
		electron: existsSync(join(root, 'electron')),
		tests: pkg.devDependencies?.vitest !== undefined,
	}
}

/**
 * Effective options used across planner/applier: disk is the source of truth
 * for platforms/tests (dirs can be added later via `add`), the manifest (when
 * present) wins for names/pm recorded at scaffold time.
 */
function effectiveOptions(
	root: string,
	manifestOptions?: Record<string, unknown>,
): ManifestOptions {
	const fromDisk = inferProjectOptions(root)
	const pickString = (key: string, fallback: string): string => {
		const v = manifestOptions?.[key]
		return typeof v === 'string' && v.length > 0 ? v : fallback
	}
	const pm = pickString('pm', fromDisk.pm)
	return {
		appName: pickString('appName', fromDisk.appName),
		appId: pickString('appId', fromDisk.appId),
		nameKebab: pickString('nameKebab', fromDisk.nameKebab),
		pm: isValidPm(pm) ? pm : 'npm',
		android: fromDisk.android,
		electron: fromDisk.electron,
		tests: fromDisk.tests,
	}
}

export function diffScripts(
	before: Record<string, string>,
	after: Record<string, string>,
): Record<string, ScriptChange> {
	const changes: Record<string, ScriptChange> = {}
	for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
		const from = before[key] ?? null
		const to = after[key] ?? null
		if (from !== to) changes[key] = {from, to}
	}
	return changes
}

function parseVersion(v: string): {nums: number[]; pre: string | null} {
	const clean = v.replace(/^[v^]/, '').trim()
	const hyphen = clean.indexOf('-')
	const core = hyphen === -1 ? clean : clean.slice(0, hyphen)
	const pre = hyphen === -1 ? null : clean.slice(hyphen + 1)
	const nums = core.split('.').map(n => Number.parseInt(n, 10) || 0)
	return {nums, pre}
}

function versionMajorMinor(v: string): {major: number; minor: number} {
	const {nums} = parseVersion(v)
	return {major: nums[0] ?? 0, minor: nums[1] ?? 0}
}

export function classifyDepChange(from: string | null, to: string): DepKind {
	if (from === null) return 'new'
	const normFrom = from.replace(/^[v^]/, '').trim()
	const normTo = to.replace(/^[v^]/, '').trim()
	if (normFrom === normTo) return 'up-to-date'
	const target = versionMajorMinor(normTo)
	const current = versionMajorMinor(normFrom)
	if (target.major !== current.major) return 'major'
	if (target.minor !== current.minor) return 'minor'
	return 'patch'
}

export function planDepChanges(pkg: Record<string, unknown>): {
	appliable: DepChange[]
	advisory: DepChange[]
} {
	const allDeps: Record<string, string> = {
		...((pkg.dependencies as Record<string, string> | undefined) ?? {}),
		...((pkg.devDependencies as Record<string, string> | undefined) ?? {}),
	}
	const appliable: DepChange[] = []
	const advisory: DepChange[] = []
	for (const [name, blessed] of Object.entries(BLESSED_DEPS)) {
		const current = allDeps[name] ?? null
		if (current === blessed) continue
		const kind = classifyDepChange(current, blessed)
		const change: DepChange = {
			pkg: name,
			from: current,
			to: blessed,
			kind,
		}
		if (kind === 'major') advisory.push(change)
		else appliable.push(change)
	}
	return {appliable, advisory}
}

export function planUpgrade(
	projectRoot: string,
	cliVersion: string = generatorVersion(),
	force = false,
	checkDeps = false,
): UpgradePlan {
	const read = readManifest(projectRoot)
	if (read.state === 'malformed')
		throw new Error(
			`${MANIFEST_NAME} is unparseable (${read.reason}); fix or delete it, then retry.`,
		)

	const pkg = readPkg(projectRoot)
	const manifest =
		read.state === 'ok' ? (read.manifest as GeneratorManifest) : undefined
	const options = effectiveOptions(projectRoot, manifest?.options)

	const empty: UpgradePlan = {
		upToDate: true,
		options,
		scriptChanges: {},
		workspaces: 'unchanged',
		devtoolsHook: 'not-applicable',
		filesToCopy: [],
		tokenDrift: [],
		versionBump: null,
		depChanges: [],
		majorAdvisory: [],
		syncNeeded: false,
		...(manifest?.createdAt ? {previousCreatedAt: manifest.createdAt} : {}),
	}

	if (read.state === 'ok') {
		const current = manifest?.generatorVersion ?? '0.0.0'
		const cmp = compareVersions(current, cliVersion)
		if (cmp >= 0 && !force) {
			const {appliable, advisory} = checkDeps
				? planDepChanges(pkg as unknown as Record<string, unknown>)
				: {appliable: [] as DepChange[], advisory: [] as DepChange[]}
			if (appliable.length === 0 && advisory.length === 0) return empty
		}
	}

	const scriptsNow = pkg.scripts ?? {}
	const scriptChanges = diffScripts(
		scriptsNow,
		computeSyncedScripts(
			scriptsNow,
			options.android,
			options.electron,
			options.pm,
		),
	)
	const ws = Array.isArray(pkg.workspaces) ? (pkg.workspaces as unknown[]) : []
	const hookState = electronDevToolsHookState(projectRoot)

	const {appliable: depChanges, advisory: majorAdvisory} = checkDeps
		? planDepChanges(pkg as unknown as Record<string, unknown>)
		: {appliable: [] as DepChange[], advisory: [] as DepChange[]}

	return {
		upToDate: false,
		options,
		...(read.state === 'missing' ? {adopt: {inferredOptions: options}} : {}),
		scriptChanges,
		workspaces:
			options.electron && !ws.includes('electron') ? 'added' : 'unchanged',
		devtoolsHook:
			!options.electron || hookState === 'missing-config'
				? 'not-applicable'
				: hookState,
		filesToCopy: findMissingTemplateFiles(projectRoot),
		tokenDrift: findTokenDrift(projectRoot),
		versionBump:
			read.state === 'ok'
				? {
						from: manifest?.generatorVersion ?? '0.0.0',
						to: cliVersion,
					}
				: null,
		depChanges,
		majorAdvisory,
		syncNeeded: depChanges.length > 0,
		...(manifest?.createdAt ? {previousCreatedAt: manifest.createdAt} : {}),
	}
}

export interface UpgradeApplyResult {
	scriptsUpdated: number
	workspacesAdded: boolean
	hookInjected: boolean
	filesCopied: string[]
	manifestWritten: boolean
	depsApplied: number
	depsSkippedMajor: number
	postVerifyOk: boolean
}

function writeManifestAt(
	root: string,
	options: ManifestOptions,
	version: string,
	createdAt?: string,
	capVersions?: Record<string, string>,
): void {
	const manifest: Record<string, unknown> = {
		schema: 1,
		generator: '@involvex/ionic-everywhere',
		generatorVersion: version,
		createdAt: createdAt ?? new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		options,
	}
	if (capVersions && Object.keys(capVersions).length > 0)
		manifest.capVersions = capVersions
	writeFileSync(
		join(root, MANIFEST_NAME),
		`${JSON.stringify(manifest, null, 2)}\n`,
	)
}

function requireCleanGit(root: string): void {
	if (!existsSync(join(root, '.git'))) return
	const res = spawnSync('git', ['status', '--porcelain'], {
		cwd: root,
		encoding: 'utf8',
		timeout: 10_000,
	})
	if (res.status === 0 && (res.stdout ?? '').trim().length > 0)
		die(
			'The project git tree has uncommitted changes. Stage or commit them, or pass --allow-dirty to override.',
		)
}

export function applyDepChanges(
	projectRoot: string,
	appliable: DepChange[],
	cliVersion: string,
	previousCreatedAt?: string,
): {applied: number; skippedMajor: number} {
	const pkgPath = join(projectRoot, 'package.json')
	const raw = readFileSync(pkgPath, 'utf8')
	const pkg = JSON.parse(raw) as {
		dependencies?: Record<string, string>
		devDependencies?: Record<string, string>
		[k: string]: unknown
	}
	const capVersions: Record<string, string> = {}
	let applied = 0
	let skippedMajor = 0
	for (const change of appliable) {
		if (change.kind === 'major') {
			skippedMajor++
			continue
		}
		const target = change.to
		const current =
			pkg.dependencies?.[change.pkg] ?? pkg.devDependencies?.[change.pkg]
		if (current === target) continue
		if (pkg.dependencies?.[change.pkg] !== undefined)
			pkg.dependencies[change.pkg] = target
		else if (pkg.devDependencies?.[change.pkg] !== undefined)
			pkg.devDependencies[change.pkg] = target
		else continue
		capVersions[change.pkg] = target
		applied++
	}
	if (applied > 0) {
		writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
		writeManifestAt(
			projectRoot,
			inferProjectOptions(projectRoot),
			cliVersion,
			previousCreatedAt,
			capVersions,
		)
	}
	return {applied, skippedMajor}
}

export function applyUpgrade(
	projectRoot: string,
	plan: UpgradePlan,
	cliVersion: string = generatorVersion(),
): UpgradeApplyResult {
	const result: UpgradeApplyResult = {
		scriptsUpdated: 0,
		workspacesAdded: false,
		hookInjected: false,
		filesCopied: [],
		manifestWritten: false,
		depsApplied: 0,
		depsSkippedMajor: 0,
		postVerifyOk: false,
	}
	if (plan.upToDate) return result

	const pkgPath = join(projectRoot, 'package.json')
	result.scriptsUpdated = Object.keys(plan.scriptChanges).length
	if (result.scriptsUpdated > 0)
		syncPlatformScripts(
			pkgPath,
			plan.options.android,
			plan.options.electron,
			plan.options.pm,
		)

	if (plan.workspaces === 'added') {
		applyWorkspaces(pkgPath, true)
		result.workspacesAdded = true
	}

	if (plan.devtoolsHook === 'injectable')
		result.hookInjected = ensureElectronDevToolsHook(projectRoot)

	for (const rel of plan.filesToCopy) {
		const src = join(templateDir(), rel)
		const dst = join(projectRoot, rel)
		mkdirSync(dirname(dst), {recursive: true})
		cpSync(src, dst)
		try {
			const content = readFileSync(dst, 'utf8')
			if (!content.includes('\u0000'))
				writeFileSync(dst, applyTokens(content, plan.options))
		} catch {
			// binary template file: copied verbatim
		}
		result.filesCopied.push(rel)
	}

	writeManifestAt(projectRoot, plan.options, cliVersion, plan.previousCreatedAt)
	result.manifestWritten = true
	return result
}

function warnDirtyGit(root: string): void {
	if (!existsSync(join(root, '.git'))) return
	const res = spawnSync('git', ['status', '--porcelain'], {
		cwd: root,
		encoding: 'utf8',
		timeout: 10_000,
	})
	if (res.status === 0 && (res.stdout ?? '').trim().length > 0)
		p.log.warn('The project git tree has uncommitted changes.')
}

async function runPostDepVerify(
	root: string,
	pm: string,
	android: boolean,
	electron: boolean,
): Promise<boolean> {
	const s = p.spinner()
	const checks: {label: string; cmd: string}[] = []
	if (android)
		checks.push({
			label: `cap sync android`,
			cmd: `${pmRun(pm)} cap sync android`,
		})
	if (electron)
		checks.push({
			label: `cap sync @capawesome/capacitor-electron`,
			cmd: `${pmRun(pm)} cap sync @capawesome/capacitor-electron`,
		})
	checks.push({
		label: 'typecheck',
		cmd: `${pm} run typecheck`,
	})
	checks.push({
		label: 'build',
		cmd: `${pm} run build`,
	})
	for (const check of checks) {
		s.start(check.label)
		const res = spawnSync('cmd', ['/c', check.cmd], {
			cwd: root,
			encoding: 'utf8',
			timeout: 120_000,
			shell: false,
		})
		if (res.status === 0) s.stop(`${check.label} ok`)
		else {
			s.stop(`${check.label} failed`)
			p.log.error(
				[
					`Post-verify failed: ${check.label}`,
					`Command: ${check.cmd}`,
					`Exit: ${res.status ?? 'signal'}`,
					...((res.stdout ?? '').trim().length > 0
						? [`stdout: ${(res.stdout ?? '').trim().slice(0, 500)}`]
						: []),
					...((res.stderr ?? '').trim().length > 0
						? [`stderr: ${(res.stderr ?? '').trim().slice(0, 500)}`]
						: []),
					'',
					'Rollback:',
					`  git diff -- package.json`,
					`  git checkout -- package.json`,
					`  ${pmInstall(pm)}`,
				].join('\n'),
			)
			return false
		}
	}
	return true
}

function formatScriptChange(key: string, change: ScriptChange): string {
	const from = change.from === null ? '(absent)' : change.from
	const to = change.to === null ? '(removed)' : change.to
	return `  ${key}: ${from}  ->  ${to}`
}

function formatDepKind(kind: DepKind): string {
	switch (kind) {
		case 'up-to-date':
			return 'up-to-date'
		case 'patch':
			return 'safe'
		case 'minor':
			return 'safe'
		case 'major':
			return 'manual'
		case 'new':
			return 'new'
	}
}

function printPlan(plan: UpgradePlan, showDeps = false): void {
	if (plan.adopt)
		p.log.info(
			`No ${MANIFEST_NAME} found - adopting this project and recording inferred options (pm: ${plan.options.pm}, id: ${plan.options.appId}).`,
		)
	if (plan.versionBump)
		p.log.message(
			`Generator version: ${plan.versionBump.from} -> ${plan.versionBump.to}`,
		)
	const scriptKeys = Object.keys(plan.scriptChanges)
	p.log.message(
		scriptKeys.length > 0
			? `Script updates (${scriptKeys.length}):`
			: 'Script updates: none',
	)
	for (const key of scriptKeys)
		p.log.message(formatScriptChange(key, plan.scriptChanges[key]))
	if (plan.workspaces === 'added') p.log.message('Workspaces: add "electron"')
	if (plan.devtoolsHook === 'injectable')
		p.log.message('DevTools hook: will be injected into the electron config')
	else if (plan.devtoolsHook === 'skipped-customized')
		p.log.message('DevTools hook: skipped (user-customized config)')
	const copyCount = plan.filesToCopy.length
	p.log.message(
		copyCount > 0
			? `New template files to copy (${copyCount}): ${plan.filesToCopy.join(', ')}`
			: 'New template files: none',
	)
	if (plan.tokenDrift.length > 0)
		p.log.warn(
			`Unreplaced tokens found (report-only, fix manually): ${plan.tokenDrift.join(', ')}`,
		)
	const appliable = plan.depChanges.filter(c => c.kind !== 'up-to-date')
	if (showDeps) {
		if (appliable.length > 0 || plan.majorAdvisory.length > 0) {
			p.log.message('Dependency updates:')
			for (const change of appliable)
				p.log.message(
					`  ${change.pkg}: ${change.from === null ? '(missing)' : change.from} -> ${change.to}  [${formatDepKind(change.kind)}]`,
				)
			if (plan.majorAdvisory.length > 0) {
				const advisoryLines = renderMajorAdvisory(plan.majorAdvisory, {
					android: plan.options.android,
					electron: plan.options.electron,
					projectRoot: '',
				})
				for (const line of advisoryLines) p.log.message(line)
			}
		} else {
			p.log.message('Dependency updates: none (all blessed deps up to date)')
		}
	}
}

function die(msg: string): never {
	p.log.error(msg)
	process.exit(1)
}

export async function runUpgrade(opts: UpgradeOptions): Promise<number> {
	let root: string
	if (opts.projectDir !== undefined) {
		root = isAbsolute(opts.projectDir)
			? opts.projectDir
			: resolve(process.cwd(), opts.projectDir)
		if (!existsSync(join(root, 'capacitor.config.ts'))) {
			die(
				`No capacitor.config.ts in ${root}. This does not look like an ionic-everywhere project.`,
			)
		}
	} else {
		const found = findProjectRoot(process.cwd())
		if (!found) {
			die(
				'No capacitor.config.ts found in this directory or any parent. Run inside an ionic-everywhere project or pass --dir <path>.',
			)
		}
		root = found
		if (root !== process.cwd()) p.log.info(`Found project root: ${root}`)
	}
	if (!existsSync(join(root, 'package.json')))
		die(`No package.json in ${root}. Not an ionic-everywhere project root.`)

	// FEAT-021 pattern: a non-TTY shell cannot confirm the plan. Fail fast
	// with actionable flags instead of hanging. --check-deps and --deps are
	// safe to run non-interactively.
	const depsMode = opts.checkDeps || opts.deps
	if (!opts.yes && !opts.dryRun && !depsMode && !isInteractive()) {
		die(
			[
				'Non-interactive shell detected - prompts are unavailable.',
				'Re-run with --yes to apply the plan, --dry-run to preview it, or --check-deps for a safe report:',
				'  ionic-everywhere upgrade --yes',
				'  ionic-everywhere upgrade --check-deps',
			].join('\n'),
		)
	}

	const cliVersion = generatorVersion()
	let plan: UpgradePlan
	try {
		plan = planUpgrade(root, cliVersion, opts.force === true, depsMode)
	} catch (err) {
		p.log.error(err instanceof Error ? err.message : String(err))
		return 1
	}

	p.intro(`ionic-everywhere upgrade - ${basename(root)}`)

	if (plan.upToDate) {
		const depNote =
			depsMode && plan.depChanges.length === 0
				? ' (dependencies also up to date)'
				: ''
		p.outro(
			`Already up to date${depNote} (generator ${cliVersion}). Use --force to re-apply.`,
		)
		return 0
	}

	printPlan(plan, depsMode)

	if (opts.dryRun) {
		p.outro('Dry run - nothing was changed.')
		return 0
	}

	if (depsMode) {
		const appliable = plan.depChanges.filter(c => c.kind !== 'up-to-date')
		if (appliable.length === 0) {
			p.outro('No dependency changes to apply.')
			return 0
		}
		const majors = plan.depChanges.filter(c => c.kind === 'major')
		if (majors.length > 0) {
			p.log.warn(
				`${majors.length} major bump(s) skipped (manual migration required):`,
			)
			for (const m of majors)
				p.log.message(
					`  ${m.pkg}: ${m.from === null ? '(missing)' : m.from} -> ${m.to}`,
				)
			if (!opts.yes) {
				const answer = await p.confirm({
					message: `Apply ${appliable.length} safe change(s) and skip ${majors.length} major(s)?`,
					initialValue: true,
				})
				if (p.isCancel(answer) || answer !== true) {
					p.cancel('Aborted - nothing was changed.')
					return 0
				}
			}
		}
		if (opts.deps && !opts.allowDirty) requireCleanGit(root)
		const {applied, skippedMajor} = applyDepChanges(
			root,
			appliable,
			cliVersion,
			plan.previousCreatedAt,
		)
		const pm = opts.pm ?? plan.options.pm
		const verifyOk = await runPostDepVerify(
			root,
			pm,
			plan.options.android,
			plan.options.electron,
		)
		p.log.message(
			[
				`Dependencies updated: ${applied} applied, ${skippedMajor} major skipped`,
				`Post-verify: ${verifyOk ? 'passed' : 'failed (see rollback instructions above)'}`,
			].join('; '),
		)
		p.outro(
			verifyOk ? 'Upgrade complete.' : 'Upgrade failed - rollback recommended.',
		)
		return verifyOk ? 0 : 1
	}

	warnDirtyGit(root)

	if (!opts.yes) {
		const answer = await p.confirm({
			message: 'Apply this upgrade plan?',
			initialValue: true,
		})
		if (p.isCancel(answer) || answer !== true) {
			p.cancel('Aborted - nothing was changed.')
			return 0
		}
	}

	const result = applyUpgrade(root, plan, cliVersion)
	const depCount = plan.depChanges.filter(c => c.kind !== 'up-to-date').length
	p.log.message(
		`Scripts updated: ${result.scriptsUpdated}; files copied: ${result.filesCopied.length}${
			result.hookInjected ? '; DevTools hook injected' : ''
		}${result.workspacesAdded ? '; electron workspace added' : ''}${
			depCount > 0
				? `; deps available: ${depCount} (re-run with --deps to apply)`
				: ''
		}`,
	)
	p.outro('Upgrade complete.')
	return 0
}
