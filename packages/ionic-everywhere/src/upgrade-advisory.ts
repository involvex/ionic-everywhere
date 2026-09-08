import {existsSync, readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import type {DepChange} from './cap-versions'

const SKILL_BASE = join(
	dirname(fileURLToPath(import.meta.url)),
	'..',
	'..',
	'..',
	'.agents',
	'skills',
	'capacitor-app-upgrades',
	'references',
)

interface AdvisoryOptions {
	android: boolean
	electron: boolean
	projectRoot: string
}

function readSkillRef(name: string): string | null {
	const p = join(SKILL_BASE, name)
	if (!existsSync(p)) return null
	return readFileSync(p, 'utf8')
}

function parseVersion(v: string): {nums: number[]; pre: string | null} {
	const clean = v.replace(/^[v^]/, '').trim()
	const hyphen = clean.indexOf('-')
	const core = hyphen === -1 ? clean : clean.slice(0, hyphen)
	const pre = hyphen === -1 ? null : clean.slice(hyphen + 1)
	const nums = core.split('.').map(n => Number.parseInt(n, 10) || 0)
	return {nums, pre}
}

function majorOf(v: string): number {
	return parseVersion(v).nums[0] ?? 0
}

function guessPackageEcosystem(pkg: string): string {
	if (pkg.startsWith('@capacitor/') || pkg === 'typescript') return 'capacitor'
	if (pkg.startsWith('@ionic/')) return 'ionic'
	if (pkg === 'react-router' || pkg === 'react-router-dom')
		return 'react-router'
	return 'unknown'
}

function refNameFor(
	ecosystem: string,
	fromMajor: number,
	toMajor: number,
): string {
	if (ecosystem === 'capacitor')
		return `upgrade-v${fromMajor}-to-v${toMajor}.md`
	if (ecosystem === 'react-router')
		return `upgrade-v${fromMajor}-to-v${toMajor}.md`
	return `upgrade-v${fromMajor}-to-v${toMajor}.md`
}

function extractSteps(md: string): Array<string | string[]> {
	const lines = md.split(/\r?\n/)
	const steps: Array<string | string[]> = []
	let inCode = false
	let codeBuf: string[] = []
	const flushCode = () => {
		if (codeBuf.length > 0) {
			steps.push([...codeBuf])
			codeBuf = []
			inCode = false
		}
	}
	for (const line of lines) {
		if (line.startsWith('```')) {
			if (!inCode) {
				flushCode()
				inCode = true
				codeBuf = [line]
			} else {
				codeBuf.push(line)
				flushCode()
			}
			continue
		}
		if (inCode) {
			codeBuf.push(line)
			continue
		}
		const m = line.match(/^##+\s+(Step\s+\d+[:\s].*)/i)
		if (m) {
			steps.push(m[1].trim())
			continue
		}
		const sub = line.match(/^###\s+(\d+[a-z]?[:\s].*)/i)
		if (sub) {
			steps.push(`  ${sub[1].trim()}`)
		}
	}
	flushCode()
	return steps
}

function electronReaddWarning(): string[] {
	return [
		'',
		'  @capawesome/capacitor-electron major:',
		'    1. Back up any customizations in electron/ (config, patches, scripts).',
		'    2. Remove-Item -Recurse electron',
		'    3. cap add @capawesome/capacitor-electron',
		'    4. Apply electron workspace pointer + DevTools hook (ionic-everywhere add desktop).',
		'    5. Reinstall from root so electron/ deps resolve via workspaces.',
	]
}

function envNotes(): string[] {
	return [
		'',
		'  Environment checks:',
		'    - JDK 21+ required for Capacitor 8+ Android builds (JDK 24+ breaks Gradle).',
		'    - Bun stable channel (prerelease builds can drop native optionalDependencies).',
	]
}

export function renderMajorAdvisory(
	changes: DepChange[],
	_opts: AdvisoryOptions,
): string[] {
	const lines: string[] = [
		'',
		'  Major version bumps require manual migration. Follow each checklist:',
		'',
	]
	for (const change of changes) {
		if (change.kind !== 'major') continue
		const fromMajor = majorOf(change.from ?? change.to)
		const toMajor = majorOf(change.to)
		const ecosystem = guessPackageEcosystem(change.pkg)
		const ref = refNameFor(ecosystem, fromMajor, toMajor)
		const md = readSkillRef(ref)
		if (md) {
			const steps = extractSteps(md)
			lines.push(
				`  ${change.pkg}: ${change.from === null ? '(missing)' : change.from} -> ${change.to}  [manual]`,
			)
			for (const step of steps) {
				if (Array.isArray(step)) {
					for (const codeLine of step) {
						lines.push(`    ${codeLine}`)
					}
				} else {
					lines.push(`    ${step}`)
				}
			}
			lines.push('')
		} else {
			lines.push(
				`  ${change.pkg}: ${change.from === null ? '(missing)' : change.from} -> ${change.to}  [manual]`,
			)
			lines.push(
				`    No upgrade guide found for ${ecosystem} ${fromMajor}->${toMajor}. Check upstream docs.`,
			)
			lines.push('')
		}
		if (change.pkg === '@capawesome/capacitor-electron') {
			lines.push(...electronReaddWarning())
			lines.push('')
		}
	}
	lines.push(...envNotes())
	return lines
}
