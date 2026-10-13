declare module '@opencode/client' {
	export const OpenCode: {
		make: (opts: {baseUrl: string; headers?: Record<string, string>}) => {
			session: {
				create: (body: {
					location?: {directory: string}
				}) => Promise<{id: string}>
				prompt: (body: {
					sessionID: string
					text: string
				}) => Promise<{parts?: Array<{type?: string; text?: string}>}>
			}
		}
	}
}
