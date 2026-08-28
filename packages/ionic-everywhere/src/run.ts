import {spawn} from 'node:child_process'
import {
	createWriteStream,
	existsSync,
	mkdirSync,
	type WriteStream,
} from 'node:fs'
import {delimiter, dirname, join} from 'node:path'
import {createInterface} from 'node:readline'

export interface RunResult {
	code: number | null
	tail: string[]
}

export interface RunStreamingOptions {
	logFile?: string
	onLine?: (line: string) => void
	tailLines?: number
}

const DEFAULT_TAIL_LINES = 50

export function runStreaming(
	cmd: string,
	cwd: string,
	opts: RunStreamingOptions = {},
): Promise<RunResult> {
	const tailLimit = opts.tailLines ?? DEFAULT_TAIL_LINES
	const tail: string[] = []
	let log: WriteStream | undefined
	if (opts.logFile) {
		mkdirSync(dirname(opts.logFile), {recursive: true})
		log = createWriteStream(opts.logFile, {flags: 'a'})
		log.write(`\n[${new Date().toISOString()}] cwd=${cwd}\n$ ${cmd}\n`)
	}

	return new Promise(resolve => {
		const bunBin = process.env.BUN_BIN
		let env: Record<string, string> | undefined
		if (bunBin) {
			const binDir = dirname(bunBin)
			const homeBin = join(process.env.HOME ?? '.', '.bun', 'bin')
			const pathEntries = (process.env.PATH ?? '')
				.split(delimiter)
				.filter(Boolean)
			if (!pathEntries.includes(binDir) && existsSync(binDir)) {
				env = {...process.env, PATH: [binDir, ...pathEntries].join(delimiter)}
			} else if (!pathEntries.includes(homeBin) && existsSync(homeBin)) {
				env = {...process.env, PATH: [homeBin, ...pathEntries].join(delimiter)}
			}
		}
		const child = spawn(cmd, {cwd, shell: true, env})
		const push = (line: string) => {
			if (line.length === 0) return
			tail.push(line)
			if (tail.length > tailLimit) tail.shift()
			if (opts.onLine) opts.onLine(line)
			log?.write(`${line}\n`)
		}
		if (child.stdout) createInterface({input: child.stdout}).on('line', push)
		if (child.stderr) createInterface({input: child.stderr}).on('line', push)
		const finish = (code: number | null) => {
			if (log) log.end(() => resolve({code, tail}))
			else resolve({code, tail})
		}
		child.on('close', code => finish(code))
		child.on('error', err => {
			push(`spawn error: ${err.message}`)
			finish(null)
		})
	})
}
