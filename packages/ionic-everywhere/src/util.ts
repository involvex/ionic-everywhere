export function toKebab(input: string): string {
	return input
		.trim()
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase()
}

export function toTitle(input: string): string {
	return input
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.split(/[-_.\s]+/)
		.filter(Boolean)
		.map(w => w[0].toUpperCase() + w.slice(1))
		.join(' ')
}

export function deriveAppId(kebab: string): string {
	const segments = kebab
		.split('-')
		.filter(Boolean)
		.map(s => s.replace(/^[^a-z]+/, ''))
		.filter(s => s.length > 0)
	const safe = segments.length > 0 ? segments : ['app']
	return `io.involvex.${safe.join('.')}`
}

export function isValidAppId(id: string): boolean {
	return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(id)
}

export const VALID_PMS = ['bun', 'npm', 'pnpm', 'yarn'] as const

export type ValidPm = (typeof VALID_PMS)[number]

export function isValidPm(pm: string): pm is ValidPm {
	return (VALID_PMS as readonly string[]).includes(pm)
}

// Blocks XML-critical characters (& < > " ' \) AND control/line-break chars:
// the app name is token-injected into single-quoted TS literals
// (capacitor.config.ts, vite.config.ts) where newlines would corrupt the files.
const UNSAFE_APP_NAME = /[&<>"'\\\r\n\t]/

function hasControlChars(name: string): boolean {
	for (const ch of name) {
		const code = ch.codePointAt(0) ?? 0
		if (code < 0x20 || code === 0x7f) return true
	}
	return false
}

export function isXmlSafeAppName(name: string): boolean {
	return !UNSAFE_APP_NAME.test(name) && !hasControlChars(name)
}

export function unsafeAppNameReason(name: string): string {
	const chars = '[&<>"\'\\\\]'
	return hasControlChars(name)
		? `contains line breaks or control characters (in addition to avoiding ${chars})`
		: `contains one of ${chars}`
}

export function detectPm(): 'bun' | 'npm' | 'pnpm' | 'yarn' {
	if (process.env.npm_config_user_agent) {
		const ua = process.env.npm_config_user_agent
		if (ua.startsWith('bun')) return 'bun'
		if (ua.startsWith('pnpm')) return 'pnpm'
		if (ua.startsWith('yarn')) return 'yarn'
	}
	return 'bun'
}

export function pmRun(pm: string): string {
	switch (pm) {
		case 'pnpm':
			return 'pnpm dlx'
		case 'yarn':
			return 'yarn dlx'
		case 'bun':
			return 'bun x'
		default:
			return 'npx'
	}
}

export function pmInstall(pm: string): string {
	switch (pm) {
		case 'pnpm':
			return 'pnpm install'
		case 'yarn':
			return 'yarn install'
		case 'bun':
			return 'bun install'
		default:
			return 'npm install'
	}
}

export function parseFlags(argv: string[]): {
	positionals: string[]
	flags: Record<string, string | boolean>
} {
	const positionals: string[] = []
	const flags: Record<string, string | boolean> = {}
	let i = 0
	while (i < argv.length) {
		const arg = argv[i]
		if (arg === '--') {
			positionals.push(...argv.slice(i + 1))
			break
		}
		if (arg.startsWith('--')) {
			const body = arg.slice(2)
			const eq = body.indexOf('=')
			if (eq !== -1) {
				flags[body.slice(0, eq)] = body.slice(eq + 1)
			} else if (body.startsWith('no-')) {
				flags[body.slice(3)] = false
			} else if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
				flags[body] = argv[i + 1]
				i++
			} else {
				flags[body] = true
			}
		} else if (arg.startsWith('-') && arg.length > 1) {
			const aliasMap: Record<string, string> = {
				y: 'yes',
				h: 'help',
				v: 'version',
			}
			const key = aliasMap[arg.slice(1)] ?? arg.slice(1)
			flags[key] =
				i + 1 < argv.length && !argv[i + 1].startsWith('-')
					? ((flags[key] as string) ?? argv[++i])
					: true
		} else {
			positionals.push(arg)
		}
		i++
	}
	return {positionals, flags}
}
