import * as p from '@clack/prompts'
import {existsSync} from 'node:fs'
import {isAbsolute, join, resolve} from 'node:path'
import {formatReport, runChecks} from './doctor'
import {prunePlatformScripts} from './platform-scripts'
import {runStreaming} from './run'
import {applyWorkspaces, scaffold} from './scaffold'
import {SCAFFOLD_LOG, step} from './step'
import {
	deriveAppId,
	detectPm,
	isValidAppId,
	isValidPm,
	isXmlSafeAppName,
	pmInstall,
	pmRun,
	toKebab,
	toTitle,
	unsafeAppNameReason,
	VALID_PMS,
} from './util'

export interface NewOptions {
	targetDir?: string
	appName?: string
	appId?: string
	pm?: string
	install: boolean
	android: boolean
	electron: boolean
	git: boolean
	yes: boolean
}

interface ResolvedConfig {
	targetDir: string
	dirName: string
	nameKebab: string
	appName: string
	appId: string
	pm: string
	install: boolean
	android: boolean
	electron: boolean
	git: boolean
}

function die(msg: string): never {
	p.log.error(msg)
	process.exit(1)
}

export interface ValidationFinding {
	field: 'pm' | 'appId' | 'appName'
	fatal: boolean
	message: string
}

export function validateNewOptions(
	opts: Pick<NewOptions, 'appId' | 'appName' | 'pm' | 'yes'>,
): ValidationFinding[] {
	const findings: ValidationFinding[] = []
	if (opts.pm !== undefined && !isValidPm(opts.pm)) {
		findings.push({
			field: 'pm',
			fatal: true,
			message: `Unsupported --pm "${opts.pm}". Choose one of: ${VALID_PMS.join(', ')}`,
		})
	}
	if (opts.appId !== undefined && !isValidAppId(opts.appId)) {
		findings.push({
			field: 'appId',
			fatal: opts.yes,
			message: opts.yes
				? `Invalid --app-id "${opts.appId}" (expected e.g. com.example.myapp)`
				: `Ignoring invalid --app-id "${opts.appId}"; you will be prompted instead`,
		})
	}
	if (opts.appName !== undefined && !isXmlSafeAppName(opts.appName)) {
		const reason = unsafeAppNameReason(opts.appName)
		findings.push({
			field: 'appName',
			fatal: opts.yes,
			message: opts.yes
				? `Invalid --name: ${reason}`
				: `Ignoring --name: ${reason}; you will be prompted instead`,
		})
	}
	return findings
}

function checkCancel(value: unknown): void {
	if (p.isCancel(value)) {
		p.cancel('Aborted.')
		process.exit(0)
	}
}

async function resolveConfig(opts: NewOptions): Promise<ResolvedConfig> {
	let targetDir = opts.targetDir ?? ''
	if (!targetDir && !opts.yes) {
		const answer = await p.text({
			message: 'Where should the project be created?',
			placeholder: './my-app',
			validate: v =>
				!v || v.trim().length === 0 ? 'Please enter a directory' : undefined,
		})
		checkCancel(answer)
		targetDir = String(answer)
	}
	if (!targetDir)
		die('No target directory given. Usage: ionic-everywhere new <dir>')
	targetDir = isAbsolute(targetDir)
		? targetDir
		: resolve(process.cwd(), targetDir)
	if (existsSync(join(targetDir, 'package.json'))) {
		die(`Directory already contains a project: ${targetDir}`)
	}

	const dirName = targetDir.split(/[\\/]/).filter(Boolean).pop() ?? 'my-app'
	const kebabDefault = toKebab(dirName) || 'my-app'

	let appName = opts.appName ?? ''
	let appId = opts.appId ?? ''
	let pm = opts.pm ?? ''
	let git = opts.git

	if (!opts.yes) {
		if (!appName) {
			const answer = await p.text({
				message: 'Display name of the app?',
				initialValue: toTitle(kebabDefault),
				placeholder: toTitle(kebabDefault),
			})
			checkCancel(answer)
			appName = String(answer).trim() || toTitle(kebabDefault)
		}
		if (!appId) {
			const derived = deriveAppId(kebabDefault)
			const answer = await p.text({
				message: 'Application ID (reverse-DNS)?',
				initialValue: derived,
				placeholder: derived,
				validate: v =>
					v && isValidAppId(v.trim())
						? undefined
						: 'Expected e.g. com.example.myapp',
			})
			checkCancel(answer)
			appId = String(answer).trim() || derived
		}
		if (!pm) {
			const detected = detectPm()
			const answer = await p.select({
				message: 'Package manager?',
				initialValue: detected,
				options: [
					{value: 'bun', label: 'bun'},
					{value: 'npm', label: 'npm'},
					{value: 'pnpm', label: 'pnpm'},
					{value: 'yarn', label: 'yarn'},
				],
			})
			checkCancel(answer)
			pm = String(answer)
		}
		if (opts.git && git !== false) {
			const answer = await p.confirm({
				message: 'Initialize a git repository?',
				initialValue: true,
			})
			checkCancel(answer)
			git = Boolean(answer)
		}
	}

	if (!appName) appName = toTitle(kebabDefault)
	if (!appId || !isValidAppId(appId)) appId = deriveAppId(kebabDefault)
	if (!pm) pm = detectPm()
	if (git === undefined) git = opts.git

	return {
		targetDir,
		dirName,
		nameKebab: kebabDefault,
		appName,
		appId,
		pm,
		install: opts.install,
		android: opts.android,
		electron: opts.electron,
		git: git ?? true,
	}
}

export async function runNew(opts: NewOptions): Promise<number> {
	const findings = validateNewOptions(opts)
	for (const f of findings.filter(f => f.fatal)) die(f.message)
	for (const f of findings) p.log.warn(f.message)
	if (findings.some(f => f.field === 'appId' && !f.fatal))
		opts = {...opts, appId: undefined}
	if (findings.some(f => f.field === 'appName' && !f.fatal))
		opts = {...opts, appName: undefined}

	const cfg = await resolveConfig(opts)

	p.intro(`ionic-everywhere - scaffolding ${cfg.nameKebab}`)
	p.log.info(`Target : ${cfg.targetDir}`)
	p.log.info(`App ID : ${cfg.appId}`)
	p.log.info(`PM     : ${cfg.pm}`)
	const targets = [
		'web',
		...(cfg.android ? ['android'] : []),
		...(cfg.electron ? ['desktop'] : []),
	]
	p.log.info(`Targets: ${targets.join(' + ')}`)

	const s = p.spinner()

	s.start('Copying template')
	try {
		scaffold(cfg)
	} catch (err) {
		s.stop('Template copy failed')
		die(err instanceof Error ? err.message : String(err))
	}
	s.stop('Template copied')

	if (!(cfg.android && cfg.electron)) {
		prunePlatformScripts(
			join(cfg.targetDir, 'package.json'),
			cfg.android,
			cfg.electron,
			cfg.pm,
		)
	}

	if (!cfg.install) {
		p.log.warn(
			'Skipping installs/platforms (--no-install). Finish setup manually:',
		)
		p.log.message(`  cd ${cfg.dirName}`)
		p.log.message(`  ${pmInstall(cfg.pm)}`)
		if (cfg.android) p.log.message(`  ${pmRun(cfg.pm)} cap add android`)
		if (cfg.electron) {
			p.log.message(`  ${pmRun(cfg.pm)} cap add @capawesome/capacitor-electron`)
			p.log.message(
				`  ${pmInstall(cfg.pm)}   # picks up electron deps via workspaces`,
			)
		}
		p.outro('Done.')
		return 0
	}

	if (
		!(await step(
			s,
			{
				start: `Installing dependencies (${cfg.pm})`,
				ok: 'Dependencies installed',
				fail: 'Install failed',
			},
			pmInstall(cfg.pm),
			cfg.targetDir,
		))
	)
		return 1

	if (cfg.android) {
		if (
			!(await step(
				s,
				{
					start: 'Adding Android platform (capacitor)',
					ok: 'Android platform added (android/)',
					fail: 'cap add android failed',
				},
				`${pmRun(cfg.pm)} cap add android`,
				cfg.targetDir,
			))
		)
			return 1
	}

	if (cfg.electron) {
		if (
			!(await step(
				s,
				{
					start: 'Adding desktop platform (@capawesome/capacitor-electron)',
					ok: 'Desktop platform added (electron/)',
					fail: 'cap add @capawesome/capacitor-electron failed',
				},
				`${pmRun(cfg.pm)} cap add @capawesome/capacitor-electron`,
				cfg.targetDir,
			))
		)
			return 1
		applyWorkspaces(join(cfg.targetDir, 'package.json'), true)
		if (
			!(await step(
				s,
				{
					start: 'Installing electron deps (workspace root)',
					ok: 'Dependencies installed',
					fail: 'Electron workspace install failed',
				},
				pmInstall(cfg.pm),
				cfg.targetDir,
			))
		)
			return 1
	}

	if (cfg.git) {
		s.start('Initializing git repository')
		let gitFailed = false
		for (const cmd of [
			'git init',
			'git add -A',
			'git commit -m "chore: scaffold with ionic-everywhere"',
		]) {
			const res = await runStreaming(cmd, cfg.targetDir, {
				logFile: SCAFFOLD_LOG,
			})
			if (res.code !== 0) {
				gitFailed = true
				break
			}
		}
		if (gitFailed) s.stop('Git init skipped (git missing or not configured)')
		else s.stop('Git repository initialized')
	}

	const checks = runChecks().filter(c => !c.ok && !c.required)
	if (checks.length > 0) {
		p.log.warn('Optional tooling missing (only needed for native builds):')
		for (const line of formatReport(checks).split('\n')) p.log.message(line)
	}

	p.outro(
		[
			'',
			'Next steps:',
			`  cd ${cfg.dirName}`,
			`  ${cfg.pm} run dev            # web dev server`,
			`  ${cfg.pm} run build         # production web build`,
			...(cfg.android && cfg.electron
				? [`  ${cfg.pm} run sync          # build once + sync both shells`]
				: []),
			...(cfg.android
				? [
						`  ${cfg.pm} run android        # run on device/emulator (auto build+sync)`,
						`  ${cfg.pm} run build:android # debug APK`,
					]
				: [`  # add Android later: ionic-everywhere add android`]),
			...(cfg.electron
				? [
						`  ${cfg.pm} run desktop        # open desktop app (auto build+sync)`,
						`  ${cfg.pm} run build:desktop # installer/portable`,
					]
				: [`  # add desktop later: ionic-everywhere add desktop`]),
		].join('\n'),
	)
	return 0
}
