import {basename} from 'node:path'
import {toKebab} from './util'

/**
 * Pure command routing: decide the action from argv without executing
 * anything. `binName` defaults to this process's entry script basename so
 * the create-* shim maps to "new".
 */
export function defaultAction(argv: string[], binName?: string): string {
	const bin = basename(binName ?? process.argv[1] ?? '').replace(
		/\.(c|m)?js$/,
		'',
	)
	if (toKebab(bin).startsWith('create')) return 'new'
	if (toKebab(bin) === 'ine') {
		const first = argv[0]
		if (!first || first.startsWith('-')) return 'new'
		return first
	}
	const first = argv[0]
	if (!first || first.startsWith('-')) return 'new'
	return first
}
