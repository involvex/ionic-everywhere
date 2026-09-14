import * as p from '@clack/prompts'
import {copyFileSync, existsSync, mkdirSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {step} from './step'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const AGENTS_SKILL_URL =
	'https://github.com/involvex/ionic-everywhere.git'

const AGENTS_SKILL_CMD = ['npx', 'skills', 'add', AGENTS_SKILL_URL]

/**
 * Set up .agents/skills/ for AI agent skills in the generated project.
 *
 * 1. Copies SKILL.md from the CLI package into .agents/skills/ionic-everywhere/
 * 2. Writes AGENTS.md to the project root with setup instructions
 * 3. Runs `npx skills add https://github.com/involvex/ionic-everywhere.git`
 */
export async function setupAgentsSkills(targetDir: string): Promise<void> {
	const skillSrcPath = join(
		__dirname,
		'..',
		'skills',
		'ionic-everywhere',
		'SKILL.md',
	)
	const agentsSkillsDir = join(
		targetDir,
		'.agents',
		'skills',
		'ionic-everywhere',
	)
	const skillDestPath = join(agentsSkillsDir, 'SKILL.md')
	const agentsMdPath = join(targetDir, 'AGENTS.md')

	if (existsSync(skillSrcPath)) {
		mkdirSync(agentsSkillsDir, {recursive: true})
		copyFileSync(skillSrcPath, skillDestPath)
	} else {
		p.log.warn('SKILL.md not found in CLI package — skipping copy')
	}

	const agentsMdContent = [
		'# Agent Skills',
		'',
		'This project has `.agents/skills/` configured for AI coding agents.',
		'',
		'## Installing Skills',
		'',
		'Use the `npx skills` CLI to install skills into this project:',
		'',
		'```bash',
		`npx skills add ${AGENTS_SKILL_URL}`,
		'```',
		'',
		'This installs the `ionic-everywhere` skill to `.agents/skills/ionic-everywhere/`',
		'and creates symlinks for detected agents (Claude Code, Cursor, OpenCode, etc.).',
		'',
		'## Available Skills',
		'',
		'- **ionic-everywhere** — Scaffold Ionic React apps that build to Web + Android + Desktop',
		'',
		'## Project Scaffolding',
		'',
		'Use the ionic-everywhere CLI to create new projects:',
		'',
		'```bash',
		'ionic-everywhere new my-app',
		'```',
		'',
		'## Related Skills',
		'',
		'- [capacitor-expert](https://github.com/capawesome-team/skills) — Comprehensive Capacitor reference',
		'- [capacitor-app-creation](https://github.com/capawesome-team/skills) — Create a new Capacitor app',
		'- [capacitor-app-development](https://github.com/capawesome-team/skills) — General Capacitor development',
		'- [capawesome-cli](https://github.com/capawesome-team/skills) — Capawesome CLI reference',
		'- [capawesome-cloud](https://github.com/capawesome-team/skills) — Live updates, native builds, app store publishing',
		'',
	].join('\n')

	writeFileSync(agentsMdPath, agentsMdContent)

	const s = p.spinner()
	if (
		!(await step(
			s,
			{
				start: 'Installing agent skills',
				ok: 'Agent skills installed',
				fail: 'Agent skills install failed',
			},
			AGENTS_SKILL_CMD,
			targetDir,
		))
	) {
		p.log.warn('Agent skills install skipped. You can run:')
		p.log.message(`  npx skills add ${AGENTS_SKILL_URL}`)
	}
}
