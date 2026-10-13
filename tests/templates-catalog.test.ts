import {describe, expect, it} from 'vitest'
import {validateNewOptions} from '../packages/ionic-everywhere/src/new'
import {
	DEFAULT_TEMPLATE_ID,
	formatTemplateCatalog,
	listTemplateIds,
	resolveTemplate,
} from '../packages/ionic-everywhere/src/templates-catalog'
import {parseFlags} from '../packages/ionic-everywhere/src/util'

describe('templates catalog', () => {
	it('defaults to tabs', () => {
		const t = resolveTemplate()
		expect(t?.id).toBe(DEFAULT_TEMPLATE_ID)
		expect(t?.base).toBe('default')
		expect(t?.feature).toBeUndefined()
	})

	it('resolves aliases', () => {
		expect(resolveTemplate('default')?.id).toBe('tabs')
		expect(resolveTemplate('minimal')?.id).toBe('blank')
		expect(resolveTemplate('vue')?.id).toBe('with-vue')
		expect(resolveTemplate('with-vue')?.base).toBe('vue')
		expect(resolveTemplate('ai')?.id).toBe('with-ai')
		expect(resolveTemplate('with-ai')?.feature).toBe('ai')
		expect(resolveTemplate('localai')?.feature).toBe('localai')
		expect(resolveTemplate('WITH-LOCALAI')?.id).toBe('with-localai')
	})

	it('returns null for unknown ids', () => {
		expect(resolveTemplate('svelte')).toBeNull()
		expect(resolveTemplate('nope')).toBeNull()
	})

	it('lists canonical ids', () => {
		expect(listTemplateIds()).toEqual([
			'tabs',
			'blank',
			'with-vue',
			'with-ai',
			'with-localai',
		])
	})

	it('formats a human catalog', () => {
		const text = formatTemplateCatalog()
		expect(text).toContain('with-vue')
		expect(text).toContain('with-ai')
		expect(text).toContain('with-localai')
	})
})

describe('validateNewOptions template', () => {
	it('fatals on unknown --template', () => {
		const findings = validateNewOptions({
			template: 'svelte',
			yes: true,
		})
		expect(findings.some(f => f.field === 'template' && f.fatal)).toBe(true)
	})

	it('accepts known aliases', () => {
		const findings = validateNewOptions({
			template: 'ai',
			yes: true,
		})
		expect(findings.filter(f => f.field === 'template')).toHaveLength(0)
	})

	it('accepts with-vue', () => {
		const findings = validateNewOptions({
			template: 'with-vue',
			yes: true,
		})
		expect(findings.filter(f => f.field === 'template')).toHaveLength(0)
	})
})

describe('parseFlags -t alias', () => {
	it('maps -t to template', () => {
		const {flags} = parseFlags(['-t', 'with-ai', '--yes'])
		expect(flags.template).toBe('with-ai')
		expect(flags.yes).toBe(true)
	})
})
