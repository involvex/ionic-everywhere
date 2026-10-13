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
	IonSelect,
	IonSelectOption,
	IonTitle,
	IonToggle,
	IonToolbar,
} from '@ionic/react'
import React from 'react'
import {useStoredState} from '../hooks/useStoredState'
import {DEFAULT_AI_SETTINGS, type AiBackend, type AiSettings} from '../lib/ai/types'

const SettingsPage: React.FC = () => {
	const [notifications, setNotifications] = useStoredState(
		'settings.notifications',
		true,
	)
	const [haptics, setHaptics] = useStoredState('settings.haptics', true)
	const [darkMode, setDarkMode] = useStoredState('settings.darkMode', false)
	const [ai, setAi] = useStoredState<AiSettings>(
		'ai.settings',
		DEFAULT_AI_SETTINGS,
	)

	const patchAi = (partial: Partial<AiSettings>) =>
		setAi({...ai, ...partial})

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
						<IonLabel>AI backend</IonLabel>
					</IonListHeader>
					<IonItem>
						<IonSelect
							label="Backend"
							labelPlacement="stacked"
							value={ai.backend}
							onIonChange={e =>
								patchAi({backend: e.detail.value as AiBackend})
							}
						>
							<IonSelectOption value="opencode">
								OpenCode (local / LAN)
							</IonSelectOption>
							<IonSelectOption value="openai-compatible">
								OpenAI-compatible
							</IonSelectOption>
						</IonSelect>
					</IonItem>
					{ai.backend === 'opencode' ? (
						<IonItem>
							<IonInput
								label="OpenCode URL"
								labelPlacement="stacked"
								value={ai.opencodeBaseUrl}
								onIonInput={e =>
									patchAi({opencodeBaseUrl: String(e.detail.value ?? '')})
								}
								placeholder="http://127.0.0.1:4096"
							/>
						</IonItem>
					) : (
						<>
							<IonItem>
								<IonInput
									label="Base URL"
									labelPlacement="stacked"
									value={ai.openaiBaseUrl}
									onIonInput={e =>
										patchAi({openaiBaseUrl: String(e.detail.value ?? '')})
									}
									placeholder="https://api.openai.com/v1"
								/>
							</IonItem>
							<IonItem>
								<IonInput
									label="Model"
									labelPlacement="stacked"
									value={ai.openaiModel}
									onIonInput={e =>
										patchAi({openaiModel: String(e.detail.value ?? '')})
									}
								/>
							</IonItem>
							<IonItem>
								<IonInput
									label="API key"
									labelPlacement="stacked"
									type="password"
									value={ai.openaiApiKey}
									onIonInput={e =>
										patchAi({openaiApiKey: String(e.detail.value ?? '')})
									}
									placeholder="Stored on-device only"
								/>
							</IonItem>
						</>
					)}
					<IonItem lines="none">
						<IonNote>
							Prefer OpenCode so cloud keys stay in the CLI agent, not the WebView.
							See AI.md in the project root.
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
