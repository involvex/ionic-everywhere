import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const TEMPLATE_PKG_PATH = join(
	dirname(fileURLToPath(import.meta.url)),
	'..',
	'templates',
	'default',
	'package.json',
)

/**
 * Single source of truth for dependency versions that generated projects
 * should pin. Bumping a version here flows into:
 *  - the template `templates/default/package.json`
 *  - `upgrade --check-deps` / `upgrade --deps` diffing
 *
 * Ranges must be kept in sync with the template. The `cap-versions.test.ts`
 * drift-guard enforces this on every test run.
 */
export const BLESSED_DEPS: Record<string, string> = {
	'@capacitor/core': '^8.5.1',
	'@capacitor/cli': '^8.5.1',
	'@capacitor/android': '^8.5.1',
	'@capacitor/preferences': '^8.0.1',
	'@capawesome/capacitor-electron': '^0.1.1',
	'@ionic/react': '^9.0.2',
	'@ionic/react-router': '^9.0.2',
	'react-router': '^6.30.6',
	'react-router-dom': '^6.30.6',
	'vite-plugin-pwa': '^1.3.0',
	'workbox-window': '^7.4.1',
	typescript: '^5.9.3',
}

export type DepKind = 'patch' | 'minor' | 'major' | 'new' | 'up-to-date'

export interface DepChange {
	pkg: string
	from: string | null
	to: string
	kind: DepKind
}

export function resolveDepTarget(pkg: string): string {
	return BLESSED_DEPS[pkg] ?? pkg
}

/**
 * Read the template's package.json and return its dependency map (deps +
 * devDeps merged). Used for drift detection.
 */
export function readTemplateDeps(): Record<string, string> {
	const raw = readFileSync(TEMPLATE_PKG_PATH, 'utf8')
	const pkg = JSON.parse(raw) as {
		dependencies?: Record<string, string>
		devDependencies?: Record<string, string>
	}
	return {
		...(pkg.dependencies ?? {}),
		...(pkg.devDependencies ?? {}),
	}
}
