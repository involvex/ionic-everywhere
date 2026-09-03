import {
	IonContent,
	IonHeader,
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

const SettingsPage: React.FC = () => {
	const [notifications, setNotifications] = useStoredState(
		'settings.notifications',
		true,
	)
	const [haptics, setHaptics] = useStoredState('settings.haptics', true)
	const [darkMode, setDarkMode] = useStoredState('settings.darkMode', false)

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
