// Android development loop: Vite dev server (HMR) + Capacitor live-reload.
// Starts Vite, then runs `cap run android --live-reload` so the device's
// WebView loads from the dev server and HMR updates push automatically.
import {spawn} from 'node:child_process'
import {existsSync} from 'node:fs'
import {createRequire} from 'node:module'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

function fail(message) {
	console.error(`[android:dev] ${message}`)
	process.exit(1)
}

if (!existsSync(join(root, 'android'))) {
	fail(
		'No android/ platform found. Add it first: <pkg-manager> run cap add android',
	)
}

let viteEntry
try {
	viteEntry = createRequire(join(root, 'package.json')).resolve(
		'vite/bin/vite.js',
	)
} catch {
	const direct = join(root, 'node_modules', 'vite', 'bin', 'vite.js')
	if (existsSync(direct)) viteEntry = direct
}
if (!viteEntry) fail('Vite is not installed. Run an install first.')

// Resolve the real Capacitor CLI entry point (not the `.bin` shim: on
// Windows that is a native launcher binary, which Node cannot execute as
// a script). Same pattern as the Vite resolution above.
let capEntry
try {
	capEntry = createRequire(join(root, 'package.json')).resolve(
		'@capacitor/cli/bin/capacitor',
	)
} catch {
	const direct = join(
		root,
		'node_modules',
		'@capacitor/cli',
		'bin',
		'capacitor',
	)
	if (existsSync(direct)) capEntry = direct
}
if (!capEntry) fail('Capacitor CLI is not installed. Run an install first.')

// 1) Start the Vite dev server and wait for its "Local:" URL.
console.log('[android:dev] starting Vite...')
const vite = spawn(process.execPath, [viteEntry], {
	cwd: root,
	stdio: ['ignore', 'pipe', 'pipe'],
})
vite.stdout.setEncoding('utf8')
vite.stderr.setEncoding('utf8')

const devUrl = await new Promise((resolveUrl, reject) => {
	let pending = ''
	let resolved = false
	const ansi = /\x1B\[[0-9;]*[A-Za-z]/g
	const onData = chunk => {
		const lines = (pending + chunk).split(/\r?\n/)
		pending = lines.pop() ?? ''
		for (const raw of lines) {
			process.stdout.write(`${raw}\n`)
			if (!resolved) {
				const match =
					/Local:\s+(https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/?)/.exec(
						raw.replace(ansi, ''),
					)
				if (match) {
					resolved = true
					resolveUrl(match[1])
				}
			}
		}
	}
	vite.stdout.on('data', onData)
	vite.stderr.on('data', onData)
	const timer = setTimeout(() => {
		if (!resolved) {
			resolved = true
			reject(new Error('timed out waiting for the Vite dev server'))
		}
	}, 30_000)
	vite.once('close', code => {
		clearTimeout(timer)
		if (!resolved) {
			resolved = true
			reject(new Error(`Vite exited early (code ${code ?? 'signal'})`))
		}
	})
}).catch(error => {
	vite.kill()
	fail(error.message)
})

// 2) Run cap run android --live-reload pointed at the dev server.
const port = new URL(devUrl).port || '5173'
console.log(`[android:dev] deploying to device (${devUrl})`)
const cap = spawn(
	process.execPath,
	[
		capEntry,
		'run',
		'android',
		'--live-reload',
		'--forwardPorts',
		`${port}:${port}`,
		'--port',
		port,
	],
	{cwd: root, stdio: 'inherit'},
)

function shutdown(exitCode) {
	vite.kill()
	cap.kill()
	process.exit(exitCode)
}
process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
vite.on('close', code => {
	console.log(`[android:dev] Vite exited (code ${code ?? 'signal'})`)
	cap.kill()
	process.exit(code ?? 0)
})
cap.on('close', code => {
	console.log('[android:dev] Capacitor process closed')
	vite.kill()
	process.exit(code ?? 0)
})
