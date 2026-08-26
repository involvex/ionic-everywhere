import * as p from '@clack/prompts'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {runStreaming} from './run'

export const SCAFFOLD_LOG = join(tmpdir(), 'ionic-everywhere-scaffold.log')

function truncateLine(line: string, max = 60): string {
	return line.length > max ? `${line.slice(0, max)}...` : line
}

export async function step(
	s: ReturnType<typeof p.spinner>,
	messages: {start: string; ok: string; fail: string},
	cmd: string,
	cwd: string,
): Promise<boolean> {
	s.start(messages.start)
	const startedAt = Date.now()
	let lastTick = 0
	const res = await runStreaming(cmd, cwd, {
		logFile: SCAFFOLD_LOG,
		onLine: line => {
			const now = Date.now()
			if (now - lastTick < 400) return
			lastTick = now
			s.message(
				`${messages.start} (${Math.round((now - startedAt) / 1000)}s) ${truncateLine(line)}`,
			)
		},
	})
	if (res.code === 0) {
		s.stop(messages.ok)
		return true
	}
	s.stop(messages.fail)
	p.log.error(
		[
			`Command failed (exit ${res.code ?? 'killed by signal'}): ${cmd}`,
			...res.tail.slice(-10),
			`Full output: ${SCAFFOLD_LOG}`,
		].join('\n'),
	)
	return false
}
