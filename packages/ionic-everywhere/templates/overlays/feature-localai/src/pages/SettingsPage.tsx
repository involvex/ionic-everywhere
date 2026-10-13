import {
	IonContent,
	IonHeader,
	IonInput,
	IonItem,
	IonLabel,
	IonList,
	IonListHeader,
	IonNote,
	IonPage,
	IonTitle,
	IonToggle,
	IonToolbar,
} from '@ionic/react'
import React from 'react'
import {useStoredState} from '../hooks/useStoredState'
import {
	DEFAULT_LOCAL_AI_SETTINGS,
	type LocalAiSettings,
} from '../lib/localai/types'

const SettingsPage: React.FC = () => {
	const [notifications, setNotifications] = useStoredState(
		'settings.notifications',
		true,
	)
	const [haptics, setHaptics] = useStoredState('settings.haptics', true)
	const [darkMode, setDarkMode] = useStoredState('settings.darkMode', false)
	const [localAi, setLocalAi] = useStoredState<LocalAiSettings>(
		'localai.settings',
		DEFAULT_LOCAL_AI_SETTINGS,
	)

	return (
		<IonPage>
			<IonHeader>
				<IonToolbar>
					<IonTitle>Settings</IonTitle>
				</IonToolbar>
			</IonHeader>
			<IonContent>
				<IonList inset>
					<IonListHeader>
						<IonLabel>Preferences</IonLabel>
					</IonListHeader>
					<IonItem>
						<IonToggle
							checked={notifications}
							onIonChange={(e: CustomEvent<{checked: boolean}>) =>
								setNotifications(e.detail.checked)
							}
						>
							Notifications
						</IonToggle>
					</IonItem>
					<IonItem>
						<IonToggle
							checked={haptics}
							onIonChange={(e: CustomEvent<{checked: boolean}>) =>
								setHaptics(e.detail.checked)
							}
						>
							Haptics
						</IonToggle>
					</IonItem>
					<IonItem lines="none">
						<IonToggle
							checked={darkMode}
							onIonChange={(e: CustomEvent<{checked: boolean}>) =>
								setDarkMode(e.detail.checked)
							}
						>
							Dark Mode
						</IonToggle>
					</IonItem>
				</IonList>

				<IonList inset>
					<IonListHeader>
						<IonLabel>Local AI</IonLabel>
					</IonListHeader>
					<IonItem>
						<IonInput
							label="Model path / WebLLM id"
							labelPlacement="stacked"
							value={localAi.modelPath}
							onIonInput={e =>
								setLocalAi({
									...localAi,
									modelPath: String(e.detail.value ?? ''),
								})
							}
							placeholder="/sdcard/Download/model.gguf"
						/>
					</IonItem>
					<IonItem>
						<IonInput
							label="Max tokens"
							labelPlacement="stacked"
							type="number"
							value={String(localAi.maxTokens)}
							onIonInput={e =>
								setLocalAi({
									...localAi,
									maxTokens: Number(e.detail.value) || 256,
								})
							}
						/>
					</IonItem>
					<IonItem lines="none">
						<IonNote>
							Android/Electron: GGUF absolute path. Web: WebLLM model id
							(empty = default). See LOCALAI.md.
						</IonNote>
					</IonItem>
				</IonList>

				<IonList inset>
					<IonItem lines="none">
						<IonLabel>Built with @involvex/ionic-everywhere</IonLabel>
						<IonNote slot="end">v0.1.0</IonNote>
					</IonItem>
				</IonList>
			</IonContent>
		</IonPage>
	)
}

export default SettingsPage
