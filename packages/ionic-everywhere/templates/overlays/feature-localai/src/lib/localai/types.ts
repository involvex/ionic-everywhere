export interface LocalAiSettings {
	/** Absolute or content-URI path to a GGUF model file. */
	modelPath: string
	/** Max tokens for generation. */
	maxTokens: number
}

export const DEFAULT_LOCAL_AI_SETTINGS: LocalAiSettings = {
	modelPath: '',
	maxTokens: 256,
}

export type LocalAiPlatform = 'android' | 'electron' | 'web' | 'unknown'

export function detectLocalAiPlatform(): LocalAiPlatform {
	const cap = (
		window as unknown as {Capacitor?: {getPlatform?: () => string}}
	).Capacitor
	const platform = cap?.getPlatform?.() ?? 'web'
	if (platform === 'android') return 'android'
	if (platform === 'electron') return 'electron'
	if (platform === 'web') {
		// Capawesome Electron often reports as web; detect via userAgent.
		if (/Electron/i.test(navigator.userAgent)) return 'electron'
		return 'web'
	}
	return 'unknown'
}
