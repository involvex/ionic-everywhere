// Cross-platform Gradle wrapper launcher.
// bun's shell does not resolve `gradlew` -> `gradlew.bat` via PATHEXT, and
// POSIX shells need `./gradlew`; this picks the right wrapper per OS so
// `node scripts/gradle.mjs assembleDebug` behaves identically everywhere.
import {spawn} from 'node:child_process'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'

const androidDir = fileURLToPath(new URL('../android', import.meta.url))
const [, , task, ...extra] = process.argv

if (!task || task.startsWith('-')) {
	console.error('usage: node scripts/gradle.mjs <gradle-task> [args...]')
	process.exit(1)
}

// Known failure signatures worth translating into actionable advice.
const KNOWN_FAILURES = [
	{
		pattern: /Unsupported class file major version (\d+)/,
		message: version =>
			`Gradle cannot parse bytecode from class-file version ${version} - your ` +
			`JAVA_HOME/PATH resolves to a JVM that is too new for the Gradle bundled ` +
			`by Capacitor (class-file 69 = JDK 25, which Gradle 8.x cannot load).\n\n` +
			`Fix: point JAVA_HOME at a mature JDK (21-23 works well), then retry:\n` +
			`  PowerShell: $env:JAVA_HOME = "<path-to-jdk-21>"\n` +
			`              $env:Path = "$env:JAVA_HOME\\bin;$env:Path"\n` +
			`  bash:       export JAVA_HOME=<path-to-jdk-21>\n\n` +
			`Tip: ionic-everywhere doctor shows which JDK will be picked up.`,
	},
]

const wrapper = join(
	androidDir,
	process.platform === 'win32' ? 'gradlew.bat' : 'gradlew',
)
const child = spawn(`"${wrapper}"`, [task, ...extra], {
	cwd: androidDir,
	stdio: ['inherit', 'pipe', 'pipe'],
	shell: true,
})

const tail = []
const forward = stream => {
	stream.setEncoding('utf8')
	let rest = ''
	stream.on('data', chunk => {
		const lines = (rest + chunk).split(/\r?\n/)
		rest = lines.pop() ?? ''
		for (const line of lines) {
			if (!line.trim()) continue
			tail.push(line)
			if (tail.length > 50) tail.shift()
			process.stdout.write(`${line}\n`)
		}
	})
}
forward(child.stdout)
forward(child.stderr)

child.on('close', code => {
	if (code === 0) process.exit(0)
	const failingLine = tail.find(line =>
		KNOWN_FAILURES.some(({pattern}) => pattern.test(line)),
	)
	const known = failingLine
		? KNOWN_FAILURES.find(({pattern}) => pattern.test(failingLine))
		: undefined
	if (known) {
		const version = known.pattern.exec(failingLine)?.[1]
		console.error(`\nionic-everywhere: ${known.message(version ?? '?')}`)
	} else {
		console.error(
			`\nionic-everywhere: Gradle exited with code ${code ?? 'signal'}.`,
		)
	}
	process.exit(code ?? 1)
})
