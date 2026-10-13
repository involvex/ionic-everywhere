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
import React, {useCallback, useState} from 'react'
import {useStoredState} from '../hooks/useStoredState'
import {streamLocalChat} from '../lib/localai/client'
import {
	DEFAULT_LOCAL_AI_SETTINGS,
	detectLocalAiPlatform,
	type LocalAiSettings,
} from '../lib/localai/types'

interface Msg {
	role: 'user' | 'assistant'
	content: string
}

const LocalChatPage: React.FC = () => {
	const [settings] = useStoredState<LocalAiSettings>(
		'localai.settings',
		DEFAULT_LOCAL_AI_SETTINGS,
	)
	const [messages, setMessages] = useState<Msg[]>([])
	const [input, setInput] = useState('')
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const platform = detectLocalAiPlatform()

	const send = useCallback(async () => {
		const text = input.trim()
		if (!text || busy) return
		setError(null)
		const next: Msg[] = [...messages, {role: 'user', content: text}]
		setMessages(next)
		setInput('')
		setBusy(true)
		let assistant = ''
		setMessages([...next, {role: 'assistant', content: ''}])
		try {
			await streamLocalChat(settings, text, {
				onToken: token => {
					assistant += token
					setMessages([...next, {role: 'assistant', content: assistant}])
				},
				onError: err => setError(err.message),
			})
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setBusy(false)
		}
	}, [busy, input, messages, settings])

	return (
		<IonPage>
			<IonHeader>
				<IonToolbar>
					<IonTitle>Local AI</IonTitle>
				</IonToolbar>
			</IonHeader>
			<IonContent className="ion-padding">
				<IonNote>
					Platform: <strong>{platform}</strong>
					{settings.modelPath
						? ` · model: ${settings.modelPath}`
						: ' · no model path set (Settings)'}
				</IonNote>
				{platform === 'web' ? (
					<p>
						On-device inference needs an Android or Electron build. The web
						shell is UI-only — see LOCALAI.md.
					</p>
				) : null}
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
						placeholder="Ask the on-device model…"
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

export default LocalChatPage
