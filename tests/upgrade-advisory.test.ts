import {describe, expect, it} from 'vitest'
import type {DepChange} from '../packages/ionic-everywhere/src/cap-versions'
import {renderMajorAdvisory} from '../packages/ionic-everywhere/src/upgrade-advisory'

describe('renderMajorAdvisory (Phase 3)', () => {
	const majorCap7To8: DepChange = {
		pkg: '@capacitor/core',
		from: '^7.0.0',
		to: '^8.0.0',
		kind: 'major',
	}

	it('renders a known Capacitor major upgrade from skill reference', () => {
		const lines = renderMajorAdvisory([majorCap7To8], {
			android: true,
			electron: false,
			projectRoot: '/tmp/project',
		})
		expect(
			lines.some(l =>
				l.includes('Major version bumps require manual migration'),
			),
		).toBe(true)
		expect(
			lines.some(l =>
				l.includes('@capacitor/core: ^7.0.0 -> ^8.0.0  [manual]'),
			),
		).toBe(true)
		expect(lines.some(l => l.includes('Step 1:'))).toBe(true)
	})

	it('falls back to upstream-docs message when no skill reference exists', () => {
		const unknown: DepChange = {
			pkg: '@ionic/react',
			from: '^8.0.0',
			to: '^9.0.0',
			kind: 'major',
		}
		const lines = renderMajorAdvisory([unknown], {
			android: false,
			electron: false,
			projectRoot: '/tmp/project',
		})
		expect(
			lines.some(l => l.includes('No upgrade guide found for ionic')),
		).toBe(true)
	})

	it('includes electron re-add warning for @capawesome/capacitor-electron majors', () => {
		const electronMajor: DepChange = {
			pkg: '@capawesome/capacitor-electron',
			from: '^0.1.1',
			to: '^0.2.0',
			kind: 'major',
		}
		const lines = renderMajorAdvisory([electronMajor], {
			android: false,
			electron: true,
			projectRoot: '/tmp/project',
		})
		expect(lines.some(l => l.includes('Remove-Item -Recurse electron'))).toBe(
			true,
		)
		expect(
			lines.some(l => l.includes('cap add @capawesome/capacitor-electron')),
		).toBe(true)
	})

	it('includes environment notes (JDK, bun)', () => {
		const lines = renderMajorAdvisory([majorCap7To8], {
			android: true,
			electron: false,
			projectRoot: '/tmp/project',
		})
		expect(lines.some(l => l.includes('JDK 21+'))).toBe(true)
		expect(lines.some(l => l.includes('Bun stable channel'))).toBe(true)
	})
})
