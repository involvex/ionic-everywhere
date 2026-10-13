/**
 * CI smoke for with-localai:
 *  - --gguf: download a tiny GGUF and run one node-llama-cpp completion
 *  - --webgpu: attempt WebLLM; skip (exit 0) when WebGPU is unavailable
 *
 * GitHub-hosted runners have no GPU, so --webgpu is expected to skip there.
 */
import {spawnSync} from 'node:child_process'
import {createWriteStream, existsSync, mkdirSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname, join} from 'node:path'
import {pipeline} from 'node:stream/promises'
import {fileURLToPath} from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = join(root, '.test', 'localai-cache')
const workDir = join(root, '.test', 'gguf-smoke')
const MODEL_URL =
	process.env.LOCALAI_GGUF_URL ??
	'https://huggingface.co/karpathy/tinyllamas/resolve/main/stories15M.gguf'
const MODEL_NAME = 'stories15M.gguf'

const flags = new Set(process.argv.slice(2))
const wantGguf = flags.has('--gguf') || flags.size === 0
const wantWebgpu = flags.has('--webgpu') || flags.size === 0

function log(msg) {
	console.log(`[localai-smoke] ${msg}`)
}

async function completeOnce(mod, sequence) {
	if (typeof sequence.prompt === 'function') {
		return String(await sequence.prompt('Hello', {maxTokens: 8}))
	}
	if (mod.LlamaCompletion) {
		const completion = new mod.LlamaCompletion({contextSequence: sequence})
		return String(
			await completion.generateCompletion('Once upon a time', {maxTokens: 8}),
		)
	}
	if (mod.LlamaChatSession) {
		const session = new mod.LlamaChatSession({contextSequence: sequence})
		return String(await session.prompt('Say hi', {maxTokens: 8}))
	}
	throw new Error('unrecognized node-llama-cpp completion API')
}

async function download(url, dest) {
	if (existsSync(dest)) {
		log(`using cached ${dest}`)
		return
	}
	mkdirSync(dirname(dest), {recursive: true})
	log(`downloading ${url}`)
	const res = await fetch(url, {redirect: 'follow'})
	if (!res.ok || !res.body) {
		throw new Error(`download failed: ${res.status} ${res.statusText}`)
	}
	await pipeline(res.body, createWriteStream(dest))
}

async function smokeGguf() {
	const modelPath = join(cacheDir, MODEL_NAME)
	await download(MODEL_URL, modelPath)
	mkdirSync(workDir, {recursive: true})
	const pkgPath = join(workDir, 'package.json')
	const {writeFileSync} = await import('node:fs')
	writeFileSync(
		pkgPath,
		`${JSON.stringify(
			{
				name: 'gguf-smoke',
				private: true,
				type: 'module',
				dependencies: {'node-llama-cpp': '^3.10.0'},
			},
			null,
			2,
		)}\n`,
	)
	log('installing node-llama-cpp in smoke workspace')
	const install = spawnSync('bun', ['install'], {
		cwd: workDir,
		stdio: 'inherit',
		shell: true,
	})
	if (install.status !== 0) {
		throw new Error('bun install node-llama-cpp failed')
	}
	const require = createRequire(join(workDir, 'package.json'))
	const resolved = require.resolve('node-llama-cpp')
	const mod = await import(resolved)
	const getLlama = mod.getLlama
	if (typeof getLlama !== 'function') {
		throw new Error('node-llama-cpp getLlama missing')
	}
	log('loading tiny GGUF')
	const llama = await getLlama()
	const model = await llama.loadModel({modelPath})
	const context = await model.createContext({contextSize: 256})
	const sequence = context.getSequence()
	const text = await completeOnce(mod, sequence)
	log(`gguf completion: ${JSON.stringify(text).slice(0, 120)}`)
	if (!String(text).trim()) {
		throw new Error('empty GGUF completion')
	}
	log('GGUF smoke OK')
}

async function smokeWebgpu() {
	const gpu =
		typeof navigator !== 'undefined' &&
		navigator.gpu &&
		typeof navigator.gpu.requestAdapter === 'function'
	if (!gpu) {
		log(
			'WebGPU unavailable on this runner — skipping WebLLM e2e (expected on GitHub-hosted CI).',
		)
		return
	}
	const {CreateMLCEngine} = await import('@mlc-ai/web-llm')
	const engine = await CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC')
	const result = await engine.chat.completions.create({
		messages: [{role: 'user', content: 'Say hi'}],
		max_tokens: 8,
	})
	const content = result.choices?.[0]?.message?.content
	log(`webgpu completion: ${JSON.stringify(content).slice(0, 120)}`)
	if (!content) throw new Error('empty WebLLM completion')
	log('WebGPU/WebLLM smoke OK')
}

try {
	if (wantGguf) await smokeGguf()
	if (wantWebgpu) await smokeWebgpu()
} catch (err) {
	console.error('[localai-smoke] FAILED', err)
	process.exit(1)
}
