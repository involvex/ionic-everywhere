import * as p from '@clack/prompts'
import {existsSync} from 'node:fs'
import {isAbsolute, join, resolve} from 'node:path'
import {findProjectRoot} from './add'
import {step} from './step'
import {detectPm, isValidPm, pmInstall, pmRun, VALID_PMS} from './util'

export interface SignOptions {
	projectDir?: string
	pm?: string
	keystore?: string
	storePass?: string
	keyAlias?: string
	keyPass?: string
	output?: string
	install: boolean
	yes: boolean
}

function die(msg: string): never {
	p.log.error(msg)
	process.exit(1)
}

export async function runSign(opts: SignOptions): Promise<number> {
	if (opts.pm !== undefined && !isValidPm(opts.pm)) {
		die(`Unsupported --pm "${opts.pm}". Choose one of: ${VALID_PMS.join(', ')}`)
	}
	const pm = opts.pm ?? detectPm()

	let dir: string
	if (opts.projectDir !== undefined) {
		dir = isAbsolute(opts.projectDir)
			? opts.projectDir
			: resolve(process.cwd(), opts.projectDir)
	} else {
		const found = findProjectRoot(process.cwd())
		if (!found) {
			die(
				'No capacitor.config.ts found in this directory or any parent. Run inside an ionic-everywhere project or pass --dir <path>.',
			)
		}
		dir = found
	}

	const pkgPath = join(dir, 'package.json')
	if (!existsSync(pkgPath)) {
		die(`No package.json in ${dir}. Run inside an ionic-everywhere project.`)
	}
	const androidDir = join(dir, 'android')
	if (!existsSync(androidDir)) {
		die(
			`No android/ directory found in ${dir}. Run "ionic-everywhere add android" first.`,
		)
	}

	p.intro('ionic-everywhere - sign Android release build')
	p.log.info(`Project: ${dir}`)
	p.log.info(`PM     : ${pm}`)

	let keystore = opts.keystore
	let storePass = opts.storePass
	let keyAlias = opts.keyAlias
	let keyPass = opts.keyPass

	if (!opts.yes && (!keystore || !storePass || !keyAlias)) {
		const result = await p.group(
			{
				keystore: () =>
					keystore
						? Promise.resolve(keystore)
						: p.text({
								message: 'Path to release keystore file (.jks or .keystore):',
								validate: val =>
									!val ? 'Keystore path is required' : undefined,
							}),
				storePass: () =>
					storePass
						? Promise.resolve(storePass)
						: p.password({
								message: 'Keystore password:',
								validate: val =>
									!val ? 'Keystore password is required' : undefined,
							}),
				keyAlias: () =>
					keyAlias
						? Promise.resolve(keyAlias)
						: p.text({
								message: 'Key alias:',
								validate: val => (!val ? 'Key alias is required' : undefined),
							}),
				keyPass: () =>
					keyPass
						? Promise.resolve(keyPass ?? '')
						: p.password({
								message:
									'Key password (leave blank if same as keystore password):',
							}),
			},
			{
				onCancel: () => {
					p.cancel('Signing cancelled.')
					process.exit(0)
				},
			},
		)
		keystore = result.keystore
		storePass = result.storePass
		keyAlias = result.keyAlias
		keyPass = result.keyPass || storePass
	} else {
		if (!keystore || !storePass || !keyAlias) {
			die(
				'Missing required signing options (--keystore, --store-pass, --key-alias). Pass them or omit --yes for interactive prompts.',
			)
		}
		keyPass = keyPass || storePass
	}

	const resolvedKeystore = isAbsolute(keystore!)
		? keystore!
		: resolve(dir, keystore!)

	if (!existsSync(resolvedKeystore)) {
		die(`Keystore file not found at: ${resolvedKeystore}`)
	}

	const s = p.spinner()

	if (
		opts.install &&
		!existsSync(join(dir, 'node_modules')) &&
		!(await step(
			s,
			{
				start: `Installing dependencies (${pm})`,
				ok: 'Dependencies installed',
				fail: 'Install failed',
			},
			pmInstall(pm),
			dir,
		))
	)
		return 1

	// Build web assets first
	if (
		!(await step(
			s,
			{
				start: 'Building web assets',
				ok: 'Web assets built',
				fail: 'Web build failed',
			},
			`${pmRun(pm)} build`,
			dir,
		))
	)
		return 1

	// Cap sync android
	if (
		!(await step(
			s,
			{
				start: 'Syncing Android platform',
				ok: 'Android platform synced',
				fail: 'cap sync android failed',
			},
			`${pmRun(pm)} cap sync android`,
			dir,
		))
	)
		return 1

	// Run gradle assembleRelease with signing properties passed via environment or gradle args
	// In Android Gradle, we can pass signing properties via -Pandroid.injected.signing.store.file=...
	const gradleArgs = [
		`"Pandroid.injected.signing.store.file=${resolvedKeystore}"`,
		`"Pandroid.injected.signing.store.password=${storePass}"`,
		`"Pandroid.injected.signing.key.alias=${keyAlias}"`,
		`"Pandroid.injected.signing.key.password=${keyPass}"`,
	].join(' ')

	if (
		!(await step(
			s,
			{
				start: 'Building signed Android release APK (assembleRelease)',
				ok: 'Signed release build successful',
				fail: 'Gradle assembleRelease failed',
			},
			process.platform === 'win32'
				? `cmd /c "cd android && gradlew assembleRelease ${gradleArgs}"`
				: `cd android && ./gradlew assembleRelease ${gradleArgs}`,
			dir,
		))
	)
		return 1

	const defaultApkPath = join(
		androidDir,
		'app',
		'build',
		'outputs',
		'apk',
		'release',
		'app-release.apk',
	)

	p.outro(
		[
			'',
			'Android release APK successfully built and signed!',
			`  APK location: ${defaultApkPath}`,
		].join('\n'),
	)

	return 0
}
