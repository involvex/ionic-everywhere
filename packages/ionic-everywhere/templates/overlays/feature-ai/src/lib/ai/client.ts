import type {AiSettings, ChatMessage} from './types'

export type StreamHandlers = {
	onToken: (text: string) => void
	onDone?: () => void
	onError?: (err: Error) => void
	signal?: AbortSignal
}

/**
 * Stream a chat reply. OpenCode talks to a local/LAN `opencode serve` (or the
 * shared v2 service). OpenAI-compatible uses `/v1/chat/completions` SSE.
 * Provider API keys stay in OpenCode or in Settings — never hardcode them.
 */
export async function streamChat(
	settings: AiSettings,
	messages: ChatMessage[],
	handlers: StreamHandlers,
): Promise<void> {
	try {
		if (settings.backend === 'opencode') {
			await streamOpenCode(settings, messages, handlers)
		} else {
			await streamOpenAiCompatible(settings, messages, handlers)
		}
		handlers.onDone?.()
	} catch (err) {
		const error = err instanceof Error ? err : new Error(String(err))
		handlers.onError?.(error)
		throw error
	}
}

async function streamOpenCode(
	settings: AiSettings,
	messages: ChatMessage[],
	handlers: StreamHandlers,
): Promise<void> {
	const base = settings.opencodeBaseUrl.replace(/\/$/, '')
	const lastUser = [...messages].reverse().find(m => m.role === 'user')
	const prompt = lastUser?.content ?? messages.map(m => m.content).join('\n')

	// Prefer typed client when installed; fall back to raw HTTP.
	try {
		const mod = await import('@opencode/client')
		const OpenCode = (
			mod as {OpenCode?: {make: (opts: {baseUrl: string}) => unknown}}
		).OpenCode
		if (OpenCode?.make) {
			const client = OpenCode.make({baseUrl: base}) as {
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
			const session = await client.session.create({
				location: {directory: '/'},
			})
			const result = await client.session.prompt({
				sessionID: session.id,
				text: prompt,
			})
			const text =
				result.parts
					?.filter(p => p.type === 'text' || typeof p.text === 'string')
					.map(p => p.text ?? '')
					.join('') ?? JSON.stringify(result)
			handlers.onToken(text)
			return
		}
	} catch {
		// Package missing or API mismatch — use HTTP below.
	}

	const sessionRes = await fetch(`${base}/session`, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({}),
		signal: handlers.signal,
	})
	if (!sessionRes.ok) {
		throw new Error(
			`OpenCode session failed (${sessionRes.status}). Is \`opencode serve\` running at ${base}?`,
		)
	}
	const session = (await sessionRes.json()) as {id?: string}
	if (!session.id) throw new Error('OpenCode returned no session id')

	const promptRes = await fetch(`${base}/session/${session.id}/prompt`, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			parts: [{type: 'text', text: prompt}],
		}),
		signal: handlers.signal,
	})
	if (!promptRes.ok) {
		throw new Error(`OpenCode prompt failed (${promptRes.status})`)
	}
	const data = (await promptRes.json()) as {
		parts?: Array<{type?: string; text?: string}>
	}
	const text =
		data.parts
			?.filter(p => typeof p.text === 'string')
			.map(p => p.text ?? '')
			.join('') ?? ''
	handlers.onToken(text || '(empty OpenCode response)')
}

async function streamOpenAiCompatible(
	settings: AiSettings,
	messages: ChatMessage[],
	handlers: StreamHandlers,
): Promise<void> {
	const base = settings.openaiBaseUrl.replace(/\/$/, '')
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	}
	if (settings.openaiApiKey) {
		headers.Authorization = `Bearer ${settings.openaiApiKey}`
	}

	const res = await fetch(`${base}/chat/completions`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			model: settings.openaiModel,
			messages,
			stream: true,
		}),
		signal: handlers.signal,
	})
	if (!res.ok) {
		const body = await res.text().catch(() => '')
		throw new Error(
			`OpenAI-compatible error (${res.status}): ${body.slice(0, 200)}`,
		)
	}
	if (!res.body) {
		throw new Error('No response body from OpenAI-compatible endpoint')
	}

	const reader = res.body.getReader()
	const decoder = new TextDecoder()
	let buffer = ''
	while (true) {
		const {done, value} = await reader.read()
		if (done) break
		buffer += decoder.decode(value, {stream: true})
		const lines = buffer.split('\n')
		buffer = lines.pop() ?? ''
		for (const line of lines) {
			const trimmed = line.trim()
			if (!trimmed.startsWith('data:')) continue
			const payload = trimmed.slice(5).trim()
			if (payload === '[DONE]') return
			try {
				const json = JSON.parse(payload) as {
					choices?: Array<{delta?: {content?: string}}>
				}
				const token = json.choices?.[0]?.delta?.content
				if (token) handlers.onToken(token)
			} catch {
				// ignore malformed SSE chunks
			}
		}
	}
}
