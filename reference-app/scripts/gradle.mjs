// Cross-platform Gradle wrapper launcher.
// bun's shell does not resolve `gradlew` -> `gradlew.bat` via PATHEXT, and
// POSIX shells need `./gradlew`; this picks the right wrapper per OS so
// `node scripts/gradle.mjs assembleDebug` behaves identically everywhere.
import {spawnSync} from 'node:child_process'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'

const androidDir = fileURLToPath(new URL('../android', import.meta.url))
const [, , task, ...extra] = process.argv

if (!task || task.startsWith('-')) {
	console.error('usage: node scripts/gradle.mjs <gradle-task> [args...]')
	process.exit(1)
}

const wrapper = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
const result = spawnSync(`"${wrapper}"`, [task, ...extra], {
	cwd: androidDir,
	stdio: 'inherit',
	shell: true,
})
process.exit(result.status ?? 1)
