import {detectLocalAiPlatform, type LocalAiSettings} from './types'

export type LocalStreamHandlers = {
	onToken: (text: string) => void
	onDone?: () => void
	onError?: (err: Error) => void
}

/** Default WebLLM model id when Settings model path is empty on web. */
export const DEFAULT_WEBLLM_MODEL = 'Llama-3.2-1B-Instruct-q4f16_1-MLC'

/**
 * On-device / in-browser chat.
 * Android: llama-cpp-capacitor · Electron: window.localAi IPC · Web: WebLLM.
 */
export async function streamLocalChat(
	settings: LocalAiSettings,
	prompt: string,
	handlers: LocalStreamHandlers,
): Promise<void> {
	const platform = detectLocalAiPlatform()
	try {
		if (platform === 'android' || platform === 'electron') {
			if (!settings.modelPath.trim()) {
				throw new Error('Set a GGUF model path in Settings before chatting.')
			}
		}
		if (platform === 'android') {
			await streamAndroid(settings, prompt, handlers)
		} else if (platform === 'electron') {
			await streamElectron(settings, prompt, handlers)
		} else if (platform === 'web') {
			await streamWeb(settings, prompt, handlers)
		} else {
			throw new Error(
				'Local AI is unsupported on this platform (see LOCALAI.md).',
			)
		}
		handlers.onDone?.()
	} catch (err) {
		const error = err instanceof Error ? err : new Error(String(err))
		handlers.onError?.(error)
		throw error
	}
}

async function streamAndroid(
	settings: LocalAiSettings,
	prompt: string,
	handlers: LocalStreamHandlers,
): Promise<void> {
	const mod = await import('llama-cpp-capacitor')
	const plugin = mod as {
		LlamaCpp?: {
			loadModel?: (opts: {path: string}) => Promise<void>
			chat?: (opts: {
				messages: Array<{role: string; content: string}>
				maxTokens?: number
			}) => Promise<{content?: string; text?: string}>
			generate?: (opts: {
				prompt: string
				maxTokens?: number
			}) => Promise<{text?: string; content?: string}>
		}
		default?: unknown
	}
	const LlamaCpp = plugin.LlamaCpp ?? (plugin.default as typeof plugin.LlamaCpp)
	if (!LlamaCpp) {
		throw new Error(
			'llama-cpp-capacitor is not available. Run a native Android build after `cap sync`.',
		)
	}
	if (typeof LlamaCpp.loadModel === 'function') {
		await LlamaCpp.loadModel({path: settings.modelPath})
	}
	if (typeof LlamaCpp.chat === 'function') {
		const result = await LlamaCpp.chat({
			messages: [{role: 'user', content: prompt}],
			maxTokens: settings.maxTokens,
		})
		handlers.onToken(result.content ?? result.text ?? '')
		return
	}
	if (typeof LlamaCpp.generate === 'function') {
		const result = await LlamaCpp.generate({
			prompt,
			maxTokens: settings.maxTokens,
		})
		handlers.onToken(result.text ?? result.content ?? '')
		return
	}
	throw new Error(
		'llama-cpp-capacitor API not recognized — check the plugin docs for the installed version.',
	)
}

async function streamElectron(
	settings: LocalAiSettings,
	prompt: string,
	handlers: LocalStreamHandlers,
): Promise<void> {
	const bridge = (
		window as unknown as {
			localAi?: {
				chat: (opts: {
					modelPath: string
					prompt: string
					maxTokens: number
				}) => Promise<string>
			}
		}
	).localAi
	if (!bridge?.chat) {
		throw new Error(
			'Electron local AI bridge missing. Re-run scaffold / ensureLocalAiElectronHook so window.localAi.chat is exposed (see LOCALAI.md).',
		)
	}
	const text = await bridge.chat({
		modelPath: settings.modelPath,
		prompt,
		maxTokens: settings.maxTokens,
	})
	handlers.onToken(text)
}

async function streamWeb(
	settings: LocalAiSettings,
	prompt: string,
	handlers: LocalStreamHandlers,
): Promise<void> {
	const modelId = settings.modelPath.trim() || DEFAULT_WEBLLM_MODEL
	const {CreateMLCEngine} = await import('@mlc-ai/web-llm')
	const engine = await CreateMLCEngine(modelId)
	const result = await engine.chat.completions.create({
		messages: [{role: 'user', content: prompt}],
		max_tokens: settings.maxTokens,
	})
	const content = result.choices?.[0]?.message?.content
	handlers.onToken(typeof content === 'string' ? content : '')
}
