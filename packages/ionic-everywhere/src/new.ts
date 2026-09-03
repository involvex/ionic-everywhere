import * as p from '@clack/prompts'
import {existsSync, rmSync} from 'node:fs'
import {isAbsolute, join, resolve} from 'node:path'
import {formatReport, runChecks} from './doctor'
import {prunePlatformScripts} from './platform-scripts'
import {runStreaming} from './run'
import {applyWorkspaces, ensureElectronDevToolsHook, scaffold} from './scaffold'
import {SCAFFOLD_LOG, step} from './step'
import {
	deriveAppId,
	detectPm,
	isInteractive,
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
	tests?: boolean
	keepOnFailure?: boolean
	template?: string
	layout?: string
	styling?: string
	theme?: string
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
	tests: boolean
	templateVariant: string
	layout: string
	styling: string
	theme: string
}

export const VALID_LAYOUTS = ['tabs', 'drawer', 'sidebar'] as const
export const VALID_STYLING = [
	'ionic-css',
	'tailwind',
	'shadcn',
	'kumo',
] as const
export const VALID_THEMES = ['light-dark', 'hacker', 'monokai'] as const

function die(msg: string): never {
	p.log.error(msg)
	process.exit(1)
}

export interface ValidationFinding {
	field: 'pm' | 'appId' | 'appName' | 'layout' | 'styling' | 'theme'
	fatal: boolean
	message: string
}

export function validateNewOptions(
	opts: Pick<
		NewOptions,
		'appId' | 'appName' | 'pm' | 'layout' | 'styling' | 'theme' | 'yes'
	>,
): ValidationFinding[] {
	const findings: ValidationFinding[] = []
	if (opts.pm !== undefined && !isValidPm(opts.pm)) {
		findings.push({
			field: 'pm',
			fatal: true,
			message: `Unsupported --pm "${opts.pm}". Choose one of: ${VALID_PMS.join(', ')}`,
		})
	}
	if (
		opts.layout !== undefined &&
		!(VALID_LAYOUTS as readonly string[]).includes(opts.layout)
	) {
		findings.push({
			field: 'layout',
			fatal: true,
			message: `Unsupported --layout "${opts.layout}". Choose one of: ${VALID_LAYOUTS.join(', ')}`,
		})
	}
	if (
		opts.styling !== undefined &&
		!(VALID_STYLING as readonly string[]).includes(opts.styling)
	) {
		findings.push({
			field: 'styling',
			fatal: true,
			message: `Unsupported --styling "${opts.styling}". Choose one of: ${VALID_STYLING.join(', ')}`,
		})
	}
	if (
		opts.theme !== undefined &&
		!(VALID_THEMES as readonly string[]).includes(opts.theme)
	) {
		findings.push({
			field: 'theme',
			fatal: true,
			message: `Unsupported --theme "${opts.theme}". Choose one of: ${VALID_THEMES.join(', ')}`,
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

export interface PromptAdapter {
	text(
		message: string,
		opts?: {
			initialValue?: string
			placeholder?: string
			validate?: (v: string) => string | undefined
		},
	): Promise<string>
	select(
		message: string,
		opts: {initialValue?: string; options: {value: string; label: string}[]},
	): Promise<string>
	confirm(message: string, initialValue: boolean): Promise<boolean>
}

const clackPrompts: PromptAdapter = {
	async text(message, opts) {
		const validate = opts?.validate
		const answer = await p.text({
			message,
			placeholder: opts?.placeholder,
			initialValue: opts?.initialValue,
			validate: validate
				? (value: string | undefined) => validate(value ?? '')
				: undefined,
		})
		checkCancel(answer)
		return String(answer)
	},
	async select(message, opts) {
		const answer = await p.select({
			message,
			options: opts.options,
			initialValue: opts.initialValue,
		})
		checkCancel(answer)
		return String(answer)
	},
	async confirm(message, initialValue) {
		const answer = await p.confirm({message, initialValue})
		checkCancel(answer)
		return Boolean(answer)
	},
}

export async function resolveConfig(
	opts: NewOptions,
	prompts: PromptAdapter = clackPrompts,
	interactive: boolean = isInteractive(),
): Promise<ResolvedConfig> {
	let targetDir = opts.targetDir ?? ''
	// FEAT-021: a non-TTY shell cannot answer prompts. Fail fast with the
	// exact flags to pass (or --yes) instead of hanging like `ionic start`.
	if (!opts.yes && !interactive) {
		if (!targetDir)
			die('No target directory given. Usage: ionic-everywhere new <dir>')
		const hints: string[] = []
		if (!opts.appName) hints.push('  --name "<display name>"')
		if (!opts.appId) hints.push('  --app-id com.example.myapp')
		if (!opts.pm) hints.push('  --pm <bun|npm|pnpm|yarn>')
		if (hints.length > 0) {
			die(
				[
					'Non-interactive shell detected - prompts are unavailable.',
					'Re-run with --yes to accept defaults, or supply:',
					...hints,
				].join('\n'),
			)
		}
		p.log.warn('Non-interactive shell detected; skipping prompts.')
	}
	if (!targetDir && !opts.yes) {
		targetDir = (
			await prompts.text('Where should the project be created?', {
				placeholder: './my-app',
				validate: v =>
					!v || v.trim().length === 0 ? 'Please enter a directory' : undefined,
			})
		).trim()
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
	let tests = opts.tests
	let layout = opts.layout ?? ''
	let styling = opts.styling ?? ''
	let theme = opts.theme ?? ''

	if (!opts.yes && interactive) {
		if (!appName) {
			const title = toTitle(kebabDefault)
			appName =
				(
					await prompts.text('Display name of the app?', {
						initialValue: title,
						placeholder: title,
					})
				).trim() || title
		}
		if (!appId) {
			const derived = deriveAppId(kebabDefault)
			appId =
				(
					await prompts.text('Application ID (reverse-DNS)?', {
						initialValue: derived,
						placeholder: derived,
						validate: v =>
							v && isValidAppId(v.trim())
								? undefined
								: 'Expected e.g. com.example.myapp',
					})
				).trim() || derived
		}
		if (!pm) {
			const detected = detectPm()
			pm = await prompts.select('Package manager?', {
				initialValue: detected,
				options: [
					{value: 'bun', label: 'bun'},
					{value: 'npm', label: 'npm'},
					{value: 'pnpm', label: 'pnpm'},
					{value: 'yarn', label: 'yarn'},
				],
			})
		}
		if (!layout) {
			layout = await prompts.select('Navigation layout style?', {
				initialValue: 'tabs',
				options: [
					{value: 'tabs', label: 'Tabs + Sidebar (default)'},
					{value: 'drawer', label: 'Drawer menu'},
					{value: 'sidebar', label: 'Persistent sidebar'},
				],
			})
		}
		if (!styling) {
			styling = await prompts.select('Styling engine / framework?', {
				initialValue: 'ionic-css',
				options: [
					{value: 'ionic-css', label: 'Ionic CSS (default)'},
					{value: 'tailwind', label: 'Tailwind CSS'},
					{value: 'shadcn', label: 'shadcn/ui + Tailwind'},
					{
						value: 'kumo',
						label: 'Cloudflare Kumo (https://github.com/cloudflare/kumo)',
					},
				],
			})
		}
		if (!theme) {
			theme = await prompts.select('Color theme?', {
				initialValue: 'light-dark',
				options: [
					{value: 'light-dark', label: 'Light + Dark toggle (default)'},
					{value: 'hacker', label: 'Hacker (green on black)'},
					{value: 'monokai', label: 'Monokai (dark)'},
				],
			})
		}
		if (opts.git && git !== false) {
			git = await prompts.confirm('Initialize a git repository?', true)
		}
		if (tests === undefined) {
			tests = await prompts.confirm('Add a Vitest testing scaffold?', true)
		}
	}

	if (!appName) appName = toTitle(kebabDefault)
	if (!appId || !isValidAppId(appId)) appId = deriveAppId(kebabDefault)
	if (!pm) pm = detectPm()
	if (!layout || !(VALID_LAYOUTS as readonly string[]).includes(layout))
		layout = 'tabs'
	if (!styling || !(VALID_STYLING as readonly string[]).includes(styling))
		styling = 'ionic-css'
	if (!theme || !(VALID_THEMES as readonly string[]).includes(theme))
		theme = 'light-dark'
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
		tests: tests ?? false,
		templateVariant: opts.template === 'minimal' ? 'minimal' : 'default',
		layout,
		styling,
		theme,
	}
}

export async function runNew(
	opts: NewOptions,
	prompts: PromptAdapter = clackPrompts,
	interactive: boolean = isInteractive(),
): Promise<number> {
	const findings = validateNewOptions(opts)
	for (const f of findings.filter(f => f.fatal)) die(f.message)
	for (const f of findings) p.log.warn(f.message)
	if (findings.some(f => f.field === 'appId' && !f.fatal))
		opts = {...opts, appId: undefined}
	if (findings.some(f => f.field === 'appName' && !f.fatal))
		opts = {...opts, appName: undefined}

	const cfg = await resolveConfig(opts, prompts, interactive)

	/**
	 * Offer to remove a half-scaffolded target after any post-copy failure.
	 * Safe to delete recursively: assertEmptyTarget() guarantees the
	 * directory was empty before the template was copied, so everything in
	 * it was created by this run.
	 */
	const cleanupAfterFailure = async (): Promise<void> => {
		if (opts.keepOnFailure) {
			p.log.warn(
				`Partial project kept at ${cfg.targetDir} (--keep-on-failure). Full log: ${SCAFFOLD_LOG}`,
			)
			return
		}
		let remove = true
		if (!opts.yes) {
			// FEAT-021: never auto-delete without an answerable prompt.
			remove = interactive
				? await prompts.confirm('Remove the partially created project?', true)
				: false
		}
		if (remove) {
			rmSync(cfg.targetDir, {recursive: true, force: true})
			p.log.message(`Removed partial project. Full log: ${SCAFFOLD_LOG}`)
		} else {
			p.log.warn(
				`Partial project kept at ${cfg.targetDir}. Log: ${SCAFFOLD_LOG}`,
			)
		}
	}

	p.intro(`ionic-everywhere - scaffolding ${cfg.nameKebab}`)
	p.log.info(`Target : ${cfg.targetDir}`)
	p.log.info(`App ID : ${cfg.appId}`)
	p.log.info(`PM     : ${cfg.pm}`)
	p.log.info(`Layout : ${cfg.layout}`)
	p.log.info(`Styling: ${cfg.styling}`)
	p.log.info(`Theme  : ${cfg.theme}`)
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
	) {
		await cleanupAfterFailure()
		return 1
	}

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
		) {
			await cleanupAfterFailure()
			return 1
		}
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
		) {
			await cleanupAfterFailure()
			return 1
		}
		applyWorkspaces(join(cfg.targetDir, 'package.json'), true)
		ensureElectronDevToolsHook(cfg.targetDir)
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
		) {
			await cleanupAfterFailure()
			return 1
		}
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
						`  ${cfg.pm} run desktop:dev   # vite + electron, hot reload + DevTools`,
						`  ${cfg.pm} run build:desktop # installer/portable`,
					]
				: [`  # add desktop later: ionic-everywhere add desktop`]),
		].join('\n'),
	)
	return 0
}
