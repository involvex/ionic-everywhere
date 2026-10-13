declare module 'llama-cpp-capacitor' {
	export const LlamaCpp: {
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
	const _default: typeof LlamaCpp
	export default _default
}
