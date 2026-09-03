#!/usr/bin/env node
import * as p from '@clack/prompts'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {runAdd, type AddOptions} from './add'
import {runBuild, type BuildOptions} from './build-cmd'
import {generateCompletions} from './completions'
import {defaultAction} from './dispatch'
import {allRequiredOk, formatReport, runChecks} from './doctor'
import {runList, type ListOptions} from './list'
import {runNew, type NewOptions} from './new'
import {runSign, type SignOptions} from './sign'
import {runUpgrade, type UpgradeOptions} from './upgrade'
import {parseFlags} from './util'

const VERSION = JSON.parse(
	readFileSync(
		join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'),
		'utf8',
	),
).version as string

const HELP = `
ionic-everywhere v${VERSION} - one responsive Ionic React codebase, web + Android + desktop

Usage:
  ionic-everywhere new [dir] [options]   Scaffold a new project
  create-ionic-everywhere [dir]          Alias for "new"
  ionic-everywhere add <android|desktop> Add a platform to an existing project
                                         ("electron" is accepted as an alias
                                         for "desktop")
  ionic-everywhere doctor                Check the environment
  ionic-everywhere list                  Show generator info for the nearest
                                         ionic-everywhere project
   ionic-everywhere upgrade               Bring an existing project's tooling
                                           up to the current template (scripts,
                                           new template files, manifest)
   ionic-everywhere build                 Run project build scripts (defaults to build:all)
   ionic-everywhere sign                  Build and sign a release APK for Android
   ionic-everywhere completions <shell>   Generate shell tab completions
                                           (powershell, bash, zsh, fish)

Options:
  --name <name>       Display name of the app (no & < > " ' \\, line breaks or
                      control characters — they break Android's strings.xml
                      and generated config files)
  --app-id <id>       Reverse-DNS application id (e.g. com.example.myapp)
  --pm <bun|npm|pnpm|yarn>
                      Package manager for the generated project
   --dir <path>        (add, list, upgrade, build) Project directory (defaults to cwd)
   --platform <target> (build) Target platform to build (all, android, desktop, web)
   -p <target>         Alias for --platform
  --json              (doctor) Print a machine-readable JSON report and exit
                      non-zero when required checks fail; (list) print the raw
                      generator manifest
  --dry-run           (upgrade) Print the plan without changing anything
  --force             (upgrade) Re-apply even when versions already match
  --no-android        Skip adding the Android platform
  --no-electron       Skip adding the desktop (Electron) platform
  --no-install        Skip dependency install and platform generation
  --no-git            Skip git init
   --tests             (new) Add a Vitest testing scaffold to the generated app
                       (interactive default: yes; --yes default: no)
   --keystore <path>   (sign) Path to the release keystore file (.jks or .keystore)
   --store-pass <pass> (sign) Password for the keystore
   --key-alias <alias> (sign) Alias for the private key
   --key-pass <pass>   (sign) Password for the private key (defaults to store-pass)
   --keep-on-failure   (new) Keep a partially created project when a setup
                      step fails instead of offering to remove it
  --yes               Accept defaults, no prompts
  -h, --help          Show this help
  -v, --version       Show version

Examples:
  bunx @involvex/ionic-everywhere new my-app
  ionic-everywhere new my-app --yes
  ionic-everywhere new my-app --no-electron   # web + Android only
  cd my-app && ionic-everywhere add desktop   # add Electron later
`

async function main(): Promise<number> {
	const argv = process.argv.slice(2)
	const action = defaultAction(argv)
	const rest =
		action === argv[0] && !argv[0].startsWith('-') ? argv.slice(1) : argv
	const {positionals, flags} = parseFlags(rest)

	if (flags.help) {
		console.log(HELP)
		return 0
	}
	if (flags.version) {
		console.log(VERSION)
		return 0
	}

	switch (action) {
		case 'doctor': {
			const checks = runChecks()
			if (flags.json === true)
				console.log(
					JSON.stringify({ok: allRequiredOk(checks), checks}, null, 2),
				)
			else console.log(formatReport(checks))
			return allRequiredOk(checks) ? 0 : 1
		}
		case 'new':
		case 'scaffold': {
			if (positionals.length > 1) {
				console.error('Too many arguments. Usage: ionic-everywhere new <dir>')
				return 1
			}
			const opts: NewOptions = {
				targetDir: positionals[0],
				appName: typeof flags.name === 'string' ? flags.name : undefined,
				appId:
					typeof flags['app-id'] === 'string' ? flags['app-id'] : undefined,
				pm: typeof flags.pm === 'string' ? flags.pm : undefined,
				install: flags.install !== false,
				android: flags.android !== false,
				electron: flags.electron !== false,
				git: flags.git !== false,
				tests: flags.tests === true,
				keepOnFailure: flags['keep-on-failure'] === true,
				template:
					typeof flags.template === 'string' ? flags.template : undefined,
				yes: flags.yes === true,
			}
			return runNew(opts)
		}
		case 'add': {
			if (positionals.length > 1) {
				console.error(
					'Too many arguments. Usage: ionic-everywhere add <android|desktop>',
				)
				return 1
			}
			const opts: AddOptions = {
				platform: positionals[0],
				projectDir: typeof flags.dir === 'string' ? flags.dir : undefined,
				pm: typeof flags.pm === 'string' ? flags.pm : undefined,
				install: flags.install !== false,
				yes: flags.yes === true,
			}
			return runAdd(opts)
		}
		case 'list': {
			if (positionals.length > 0) {
				console.error(
					'list takes no arguments. Usage: ionic-everywhere list [--dir <path>]',
				)
				return 1
			}
			const opts: ListOptions = {
				projectDir: typeof flags.dir === 'string' ? flags.dir : undefined,
				json: flags.json === true,
			}
			return runList(opts)
		}
		case 'upgrade': {
			if (positionals.length > 0) {
				console.error(
					'upgrade takes no arguments. Usage: ionic-everywhere upgrade [--dir <path>]',
				)
				return 1
			}
			const opts: UpgradeOptions = {
				projectDir: typeof flags.dir === 'string' ? flags.dir : undefined,
				pm: typeof flags.pm === 'string' ? flags.pm : undefined,
				dryRun: flags['dry-run'] === true,
				force: flags.force === true,
				yes: flags.yes === true,
			}
			return runUpgrade(opts)
		}
		case 'build': {
			if (positionals.length > 0) {
				console.error(
					'build takes no arguments. Usage: ionic-everywhere build [--platform <target>] [--dir <path>]',
				)
				return 1
			}
			const opts: BuildOptions = {
				projectDir: typeof flags.dir === 'string' ? flags.dir : undefined,
				pm: typeof flags.pm === 'string' ? flags.pm : undefined,
				platform:
					typeof flags.platform === 'string'
						? flags.platform
						: typeof flags.p === 'string'
							? flags.p
							: undefined,
			}
			return runBuild(opts)
		}
		case 'sign': {
			if (positionals.length > 0) {
				console.error(
					'sign takes no arguments. Usage: ionic-everywhere sign [options]',
				)
				return 1
			}
			const opts: SignOptions = {
				projectDir: typeof flags.dir === 'string' ? flags.dir : undefined,
				pm: typeof flags.pm === 'string' ? flags.pm : undefined,
				keystore:
					typeof flags.keystore === 'string' ? flags.keystore : undefined,
				storePass:
					typeof flags['store-pass'] === 'string'
						? flags['store-pass']
						: undefined,
				keyAlias:
					typeof flags['key-alias'] === 'string'
						? flags['key-alias']
						: undefined,
				keyPass:
					typeof flags['key-pass'] === 'string' ? flags['key-pass'] : undefined,
				install: flags.install !== false,
				yes: flags.yes === true,
			}
			return runSign(opts)
		}
		case 'completions': {
			const shell = positionals[0] ?? 'powershell'
			try {
				const script = generateCompletions(shell)
				console.log(script)
				return 0
			} catch (err) {
				console.error(err instanceof Error ? err.message : String(err))
				return 1
			}
		}
		default:
			console.error(`Unknown command: ${action}\n${HELP}`)
			return 1
	}
}

main()
	.then(code => process.exit(code))
	.catch(err => {
		p.log.error(err instanceof Error ? err.message : String(err))
		process.exit(1)
	})
