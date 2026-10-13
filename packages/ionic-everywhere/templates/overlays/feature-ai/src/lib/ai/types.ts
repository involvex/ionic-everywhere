export type AiBackend = 'opencode' | 'openai-compatible'

export interface AiSettings {
	backend: AiBackend
	/** OpenCode serve / shared service URL (default http://127.0.0.1:4096). */
	opencodeBaseUrl: string
	/** OpenAI-compatible base URL (e.g. https://api.openai.com/v1). */
	openaiBaseUrl: string
	/** Model id for OpenAI-compatible backends. */
	openaiModel: string
	/** Optional API key for OpenAI-compatible backends (never commit this). */
	openaiApiKey: string
}

export interface ChatMessage {
	role: 'user' | 'assistant' | 'system'
	content: string
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
	backend: 'opencode',
	opencodeBaseUrl: 'http://127.0.0.1:4096',
	openaiBaseUrl: 'https://api.openai.com/v1',
	openaiModel: 'gpt-4o-mini',
	openaiApiKey: '',
}
