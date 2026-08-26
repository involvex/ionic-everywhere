// Desktop development loop: Vite dev server (HMR) + Electron shell.
// Uses CAPACITOR_ELECTRON_DEV_SERVER_URL, natively supported by
// @capawesome/capacitor-electron - see reference-app/NOTES.md #15.
// DevTools auto-open via the hooks block the CLI injects into
// electron/capacitor.electron.config.ts (guarded to dev mode only).
import {spawn} from 'node:child_process'
import {existsSync} from 'node:fs'
import {createRequire} from 'node:module'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const electronDir = join(root, 'electron')

function fail(message) {
	console.error(`desktop:dev - ${message}`)
	process.exit(1)
}

if (!existsSync(join(electronDir, 'package.json'))) {
	fail(
		'No electron/ platform found. Add it first: <pkg-manager> run cap add @capawesome/capacitor-electron',
	)
}

let electronExe
try {
	const requireFromElectron = createRequire(join(electronDir, 'index.js'))
	electronExe = requireFromElectron('electron')
} catch {
	fail('Electron is not installed. Run an install, then retry.')
}
if (!electronExe || !existsSync(electronExe)) {
	fail(
		'Electron binary missing (postinstall scripts skipped?). Run an install in electron/, then retry.',
	)
}

let viteEntry
try {
	viteEntry = createRequire(join(root, 'package.json')).resolve(
		'vite/bin/vite.js',
	)
} catch {
	// Vite's exports map does not expose ./bin/vite.js - fall back to disk.
	const direct = join(root, 'node_modules', 'vite', 'bin', 'vite.js')
	if (existsSync(direct)) viteEntry = direct
}
if (!viteEntry) fail('Vite is not installed. Run an install first.')

// 1) Start the Vite dev server and wait for its "Local:" URL.
console.log('[desktop:dev] starting Vite...')
const vite = spawn(process.execPath, [viteEntry], {
	cwd: root,
	stdio: ['ignore', 'pipe', 'pipe'],
})
vite.stdout.setEncoding('utf8')
vite.stderr.setEncoding('utf8')

const devUrl = await new Promise((resolveUrl, reject) => {
	let pending = ''
	let resolved = false
	// Vite decorates its output with ANSI colors - strip them before matching.
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

// 2) Launch Electron pointed at the dev server.
console.log(`[desktop:dev] launching Electron (${devUrl})`)
const electron = spawn(electronExe, ['.'], {
	cwd: electronDir,
	env: {...process.env, CAPACITOR_ELECTRON_DEV_SERVER_URL: devUrl},
	stdio: 'inherit',
})

function shutdown(exitCode) {
	vite.kill()
	electron.kill()
	process.exit(exitCode)
}
process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
vite.on('close', code => {
	console.log(`[desktop:dev] Vite exited (code ${code ?? 'signal'})`)
	electron.kill()
})
electron.on('close', code => {
	console.log('[desktop:dev] Electron closed')
	vite.kill()
	process.exit(code ?? 0)
})
