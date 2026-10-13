/**
 * Expo-style named template catalog for `ionic-everywhere new -t <id>`.
 * Each entry picks a base tree (`default` | `minimal` | `vue`) and an optional
 * feature overlay under `templates/overlays/feature-<id>/`.
 */

export interface TemplateEntry {
	/** Canonical id written to the generator manifest. */
	id: string
	/** Alternate spellings accepted by `--template` / `-t`. */
	aliases: readonly string[]
	description: string
	base: 'default' | 'minimal' | 'vue'
	/** Feature overlay folder name after `feature-` (e.g. `ai` → feature-ai). */
	feature?: string
}

export const TEMPLATES: readonly TemplateEntry[] = [
	{
		id: 'tabs',
		aliases: ['default', 'tabs'],
		description: 'Tabs + sidebar Ionic React starter (default)',
		base: 'default',
	},
	{
		id: 'blank',
		aliases: ['blank', 'minimal'],
		description: 'Minimal Ionic React starter',
		base: 'minimal',
	},
	{
		id: 'with-vue',
		aliases: ['with-vue', 'vue'],
		description: 'Tabs + sidebar Ionic Vue starter',
		base: 'vue',
	},
	{
		id: 'with-ai',
		aliases: ['with-ai', 'ai'],
		description: 'Chat UI + OpenCode v2 / OpenAI-compatible backend',
		base: 'default',
		feature: 'ai',
	},
	{
		id: 'with-localai',
		aliases: ['with-localai', 'localai'],
		description: 'On-device LLM (llama.cpp) for Android + Electron',
		base: 'default',
		feature: 'localai',
	},
] as const

export const DEFAULT_TEMPLATE_ID = 'tabs'

const BY_ALIAS = new Map<string, TemplateEntry>()
for (const entry of TEMPLATES) {
	for (const alias of entry.aliases) {
		BY_ALIAS.set(alias.toLowerCase(), entry)
	}
	BY_ALIAS.set(entry.id.toLowerCase(), entry)
}

export function resolveTemplate(input?: string): TemplateEntry | null {
	if (input === undefined || input.trim() === '') {
		return TEMPLATES.find(t => t.id === DEFAULT_TEMPLATE_ID) ?? TEMPLATES[0]
	}
	return BY_ALIAS.get(input.trim().toLowerCase()) ?? null
}

export function listTemplateIds(): string[] {
	return TEMPLATES.map(t => t.id)
}

export function formatTemplateCatalog(): string {
	const lines = ['Available templates (-t / --template):']
	for (const t of TEMPLATES) {
		const aliasNote =
			t.aliases.filter(a => a !== t.id).length > 0
				? ` (aliases: ${t.aliases.filter(a => a !== t.id).join(', ')})`
				: ''
		lines.push(`  ${t.id.padEnd(14)} ${t.description}${aliasNote}`)
	}
	return lines.join('\n')
}

export function templatePromptOptions(): {value: string; label: string}[] {
	return TEMPLATES.map(t => ({
		value: t.id,
		label: `${t.id} — ${t.description}`,
	}))
}
