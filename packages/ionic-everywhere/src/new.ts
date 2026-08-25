import * as p from '@clack/prompts'
import {execSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import {isAbsolute, join, resolve} from 'node:path'
import {formatReport, runChecks} from './doctor'
import {prunePlatformScripts, scaffold} from './scaffold'
import {
	deriveAppId,
	detectPm,
	isValidAppId,
	pmInstall,
	pmRun,
	toKebab,
	toTitle,
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

function run(cmd: string, cwd: string): void {
	execSync(cmd, {cwd, stdio: 'pipe'})
}

export async function runNew(opts: NewOptions): Promise<number> {
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
		if (cfg.electron)
			p.log.message(`  ${pmRun(cfg.pm)} cap add @capawesome/capacitor-electron`)
		p.outro('Done.')
		return 0
	}

	s.start(`Installing dependencies (${cfg.pm})`)
	try {
		run(pmInstall(cfg.pm), cfg.targetDir)
		s.stop('Dependencies installed')
	} catch (err) {
		s.stop('Install failed')
		die(
			err instanceof Error
				? err.message.split('\n').slice(-3).join('\n')
				: String(err),
		)
	}

	if (cfg.android) {
		s.start('Adding Android platform (capacitor)')
		try {
			run(`${pmRun(cfg.pm)} cap add android`, cfg.targetDir)
			s.stop('Android platform added (android/)')
		} catch (err) {
			s.stop('cap add android failed')
			die(
				err instanceof Error
					? err.message.split('\n').slice(-3).join('\n')
					: String(err),
			)
		}
	}

	if (cfg.electron) {
		s.start('Adding desktop platform (@capawesome/capacitor-electron)')
		try {
			run(
				`${pmRun(cfg.pm)} cap add @capawesome/capacitor-electron`,
				cfg.targetDir,
			)
			run(pmInstall(cfg.pm), join(cfg.targetDir, 'electron'))
			s.stop('Desktop platform added (electron/)')
		} catch (err) {
			s.stop('Electron platform failed')
			die(
				err instanceof Error
					? err.message.split('\n').slice(-3).join('\n')
					: String(err),
			)
		}
	}

	if (cfg.git) {
		s.start('Initializing git repository')
		try {
			run('git init', cfg.targetDir)
			run('git add -A', cfg.targetDir)
			run(
				'git commit -m "chore: scaffold with ionic-everywhere"',
				cfg.targetDir,
			)
			s.stop('Git repository initialized')
		} catch {
			s.stop('Git init skipped (git missing or not configured)')
		}
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
				: [`  # add Android later: ${pmRun(cfg.pm)} cap add android`]),
			...(cfg.electron
				? [
						`  ${cfg.pm} run desktop        # open desktop app (auto build+sync)`,
						`  ${cfg.pm} run build:desktop # installer/portable`,
					]
				: [
						`  # add desktop later: ${pmRun(cfg.pm)} cap add @capawesome/capacitor-electron`,
					]),
		].join('\n'),
	)
	return 0
}
