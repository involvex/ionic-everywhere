#!/usr/bin/env node
import * as p from '@clack/prompts'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {runAdd, type AddOptions} from './add'
import {defaultAction} from './dispatch'
import {allRequiredOk, formatReport, runChecks} from './doctor'
import {runNew, type NewOptions} from './new'
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

Options:
  --name <name>       Display name of the app (no & < > " ' \\, line breaks or
                      control characters — they break Android's strings.xml
                      and generated config files)
  --app-id <id>       Reverse-DNS application id (e.g. com.example.myapp)
  --pm <bun|npm|pnpm|yarn>
                      Package manager for the generated project
  --dir <path>        (add) Project directory (defaults to cwd)
  --json              (doctor) Print a machine-readable JSON report and exit
                      non-zero when required checks fail
  --no-android        Skip adding the Android platform
  --no-electron       Skip adding the desktop (Electron) platform
  --no-install        Skip dependency install and platform generation
  --no-git            Skip git init
  --tests             (new) Add a Vitest testing scaffold to the generated app
                      (interactive default: yes; --yes default: no)
  --keep-on-failure   (new) Keep a partially created project when a setup
                      step fails instead of offering to remove it
  --yes               Accept defaults, no prompts
  -h, --help          Show this help
  -v, --version       Show version

Examples:
  bunx create-ionic-everywhere my-app
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
