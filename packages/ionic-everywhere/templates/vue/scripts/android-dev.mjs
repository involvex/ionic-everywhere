// Android development loop: Vite dev server (HMR) + Capacitor live-reload.
// Starts Vite, then runs `cap run android --live-reload` so the device's
// WebView loads from the dev server and HMR updates push automatically.
import {spawn} from 'node:child_process'
import {existsSync} from 'node:fs'
import {createRequire} from 'node:module'
import {networkInterfaces} from 'node:os'
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
// `--host` binds all interfaces (not just localhost): `cap run` points the
// device at this machine's LAN IP, which is unreachable when Vite listens
// on loopback only.
console.log('[android:dev] starting Vite...')
const vite = spawn(process.execPath, [viteEntry, '--host'], {
	cwd: root,
	stdio: ['ignore', 'pipe', 'pipe'],
})
vite.stdout.setEncoding('utf8')
vite.stderr.setEncoding('utf8')

const devUrl = await new Promise((resolveUrl, reject) => {
	let pending = ''
	let resolved = false
	// ESC (0x1B) via fromCharCode so the source has no control-char literal (no-control-regex).
	const ansi = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, 'g')
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
// The device loads Vite via this machine's LAN IP. `cap run` defaults to
// the first non-loopback interface, which is often a VPN/virtual adapter
// (e.g. Tailscale) the phone cannot reach — so pick a reachable address:
// an explicit ANDROID_DEV_HOST override, else the first RFC 1918 private
// IPv4, else the first non-link-local IPv4. Without a pick, cap chooses.
function pickLanIp() {
	if (process.env.ANDROID_DEV_HOST) return process.env.ANDROID_DEV_HOST
	const addrs = Object.values(networkInterfaces())
		.flat()
		.filter(a => a && (a.family === 'IPv4' || a.family === 4) && !a.internal)
		.map(a => a.address)
	const privateLan = addrs.find(a =>
		/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a),
	)
	return privateLan ?? addrs.find(a => !a.startsWith('169.254.'))
}
const lanHost = pickLanIp()
console.log(
	`[android:dev] deploying to device (${devUrl}, live-reload host: ${lanHost ?? 'cap default'})`,
)
const cap = spawn(
	process.execPath,
	[
		capEntry,
		'run',
		'android',
		'--live-reload',
		'--forwardPorts',
		`${port}:${port}`,
		...(lanHost ? ['--host', lanHost] : []),
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
