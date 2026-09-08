import {execSync} from 'node:child_process'
import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'

const root = join(import.meta.dirname, '..')
const pkgPath = join(root, 'packages', 'ionic-everywhere', 'package.json')
const changelogPath = join(root, 'packages', 'ionic-everywhere', 'CHANGELOG.md')

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const version = pkg.version
const today = new Date().toISOString().slice(0, 10)

const versionHeader = `## [${version}]`
const dateLine = `## [${version}] - ${today}`

if (existsSync(changelogPath)) {
  const current = readFileSync(changelogPath, 'utf8')
  if (current.includes(versionHeader)) {
    console.log(`Changelog already contains ${versionHeader}; nothing to do.`)
    process.exit(0)
  }
}

const tag = execSync('git tag --list "v*" --sort=-v:refname', {
	encoding: 'utf8',
})
	.trim()
	.split('\n')[0]
const range = tag ? `${tag}..HEAD` : null

let log = ''
if (range) {
	try {
		log = execSync(`git log ${range} --pretty=format:"%s" --no-merges`, {
			encoding: 'utf8',
		})
	} catch {
		log = ''
	}
}

const sections = {
	Added: [],
	Changed: [],
	Deprecated: [],
	Removed: [],
	Fixed: [],
	Security: [],
}

for (const line of log.split('\n').filter(Boolean)) {
	const trimmed = line.trim()
	const match = trimmed.match(
		/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+?\))?(!)?:\s*(.+)$/,
	)
	if (!match) continue
	const type = match[1]
	const scope = match[2]?.replace(/[()]/g, '') || ''
	const desc = match[4]?.trim() || trimmed
	const bullet = scope ? `- ${desc} (\`${scope}\`)` : `- ${desc}`

	switch (type) {
		case 'feat':
			sections.Added.push(bullet)
			break
		case 'fix':
			sections.Fixed.push(bullet)
			break
		case 'docs':
			sections.Changed.push(bullet)
			break
		case 'style':
			sections.Changed.push(bullet)
			break
		case 'refactor':
			sections.Changed.push(bullet)
			break
		case 'perf':
			sections.Changed.push(bullet)
			break
		case 'test':
			sections.Added.push(bullet)
			break
		case 'build':
		case 'ci':
		case 'chore':
			sections.Changed.push(bullet)
			break
		case 'revert':
			sections.Changed.push(bullet)
			break
		default:
			sections.Changed.push(bullet)
	}
}

const lines = [dateLine]
let hasContent = false

for (const [section, bullets] of Object.entries(sections)) {
	if (bullets.length === 0) continue
	hasContent = true
	lines.push(`\n### ${section}`)
	for (const b of bullets) lines.push(b)
}

if (!hasContent) {
	lines.push('\n- Patch release with publishing pipeline improvements.')
}

lines.push('')

if (existsSync(changelogPath)) {
	const current = readFileSync(changelogPath, 'utf8')
	writeFileSync(changelogPath, `${lines.join('\n')}${current}`)
} else {
	writeFileSync(changelogPath, `# Changelog\n\n${lines.join('\n')}`)
}

console.log(`Updated ${changelogPath} with ${dateLine}`)
