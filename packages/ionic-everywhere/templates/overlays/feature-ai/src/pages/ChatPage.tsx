import {
	IonButton,
	IonContent,
	IonFooter,
	IonHeader,
	IonItem,
	IonLabel,
	IonList,
	IonNote,
	IonPage,
	IonSpinner,
	IonTextarea,
	IonTitle,
	IonToolbar,
} from '@ionic/react'
import React, {useCallback, useRef, useState} from 'react'
import {streamChat} from '../lib/ai/client'
import {DEFAULT_AI_SETTINGS, type ChatMessage} from '../lib/ai/types'
import {useStoredState} from '../hooks/useStoredState'
import type {AiSettings} from '../lib/ai/types'

const ChatPage: React.FC = () => {
	const [settings] = useStoredState<AiSettings>(
		'ai.settings',
		DEFAULT_AI_SETTINGS,
	)
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [input, setInput] = useState('')
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const abortRef = useRef<AbortController | null>(null)

	const send = useCallback(async () => {
		const text = input.trim()
		if (!text || busy) return
		setError(null)
		const nextMessages: ChatMessage[] = [
			...messages,
			{role: 'user', content: text},
		]
		setMessages(nextMessages)
		setInput('')
		setBusy(true)
		abortRef.current?.abort()
		abortRef.current = new AbortController()

		let assistant = ''
		setMessages([...nextMessages, {role: 'assistant', content: ''}])
		try {
			await streamChat(settings, nextMessages, {
				signal: abortRef.current.signal,
				onToken: token => {
					assistant += token
					setMessages([
						...nextMessages,
						{role: 'assistant', content: assistant},
					])
				},
				onError: err => setError(err.message),
			})
		} catch (err) {
			if ((err as Error)?.name !== 'AbortError') {
				setError(err instanceof Error ? err.message : String(err))
			}
		} finally {
			setBusy(false)
		}
	}, [busy, input, messages, settings])

	return (
		<IonPage>
			<IonHeader>
				<IonToolbar>
					<IonTitle>Chat</IonTitle>
				</IonToolbar>
			</IonHeader>
			<IonContent className="ion-padding">
				<IonNote>
					Backend: <strong>{settings.backend}</strong>
					{settings.backend === 'opencode'
						? ` → ${settings.opencodeBaseUrl}`
						: ` → ${settings.openaiModel}`}
					. Configure in Settings. On Android, point OpenCode at a LAN URL.
				</IonNote>
				{error ? (
					<p style={{color: 'var(--ion-color-danger)'}}>{error}</p>
				) : null}
				<IonList>
					{messages.map((m, i) => (
						<IonItem key={`${m.role}-${i}`}>
							<IonLabel className="ion-text-wrap">
								<h3>{m.role}</h3>
								<p style={{whiteSpace: 'pre-wrap'}}>{m.content}</p>
							</IonLabel>
						</IonItem>
					))}
				</IonList>
				{busy ? <IonSpinner name="dots" /> : null}
			</IonContent>
			<IonFooter>
				<IonToolbar>
					<IonTextarea
						autoGrow
						value={input}
						placeholder="Message…"
						onIonInput={e => setInput(e.detail.value ?? '')}
						disabled={busy}
					/>
					<IonButton
						expand="block"
						onClick={() => void send()}
						disabled={busy || !input.trim()}
					>
						Send
					</IonButton>
				</IonToolbar>
			</IonFooter>
		</IonPage>
	)
}

export default ChatPage
