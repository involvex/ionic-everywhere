#!/usr/bin/env node
import * as p from '@clack/prompts'
import {readFileSync} from 'node:fs'
import {basename, dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {formatReport, runChecks} from './doctor'
import {runNew, type NewOptions} from './new'
import {parseFlags, toKebab} from './util'

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
  ionic-everywhere doctor                Check the environment

Options:
  --name <name>       Display name of the app
  --app-id <id>       Reverse-DNS application id (e.g. com.example.myapp)
  --pm <bun|npm|pnpm|yarn>
  --no-android        Skip adding the Android platform
  --no-electron       Skip adding the desktop (Electron) platform
  --no-install        Skip dependency install and platform generation
  --no-git            Skip git init
  --yes               Accept defaults, no prompts
  -h, --help          Show this help
  -v, --version       Show version

Examples:
  bunx create-ionic-everywhere my-app
  ionic-everywhere new my-app --yes
  ionic-everywhere new my-app --no-electron   # web + Android only
`

function defaultAction(argv: string[]): string {
	const bin = basename(process.argv[1] ?? '').replace(/\.(c|m)?js$/, '')
	if (toKebab(bin).startsWith('create')) return 'new'
	const first = argv[0]
	if (!first || first.startsWith('-')) return 'new'
	return first
}

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
			console.log(formatReport(runChecks()))
			return 0
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
				yes: flags.yes === true,
			}
			return runNew(opts)
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
