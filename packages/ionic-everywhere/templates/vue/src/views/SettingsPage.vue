<template>
	<ion-page>
		<ion-header>
			<ion-toolbar>
				<ion-title>Settings</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content>
			<ion-list inset>
				<ion-list-header>
					<ion-label>Preferences</ion-label>
				</ion-list-header>
				<ion-item>
					<ion-toggle
						:checked="notifications"
						@ionChange="
							(e: CustomEvent<{checked: boolean}>) =>
								setNotifications(e.detail.checked)
						"
					>
						Notifications
					</ion-toggle>
				</ion-item>
				<ion-item>
					<ion-toggle
						:checked="haptics"
						@ionChange="
							(e: CustomEvent<{checked: boolean}>) =>
								setHaptics(e.detail.checked)
						"
					>
						Haptics
					</ion-toggle>
				</ion-item>
				<ion-item lines="none">
					<ion-toggle
						:checked="darkMode"
						@ionChange="
							(e: CustomEvent<{checked: boolean}>) =>
								setDarkMode(e.detail.checked)
						"
					>
						Dark Mode
					</ion-toggle>
				</ion-item>
				<ion-item lines="none">
					<ion-label>Built with @involvex/ionic-everywhere</ion-label>
					<ion-note slot="end">Vue</ion-note>
				</ion-item>
			</ion-list>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
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
} from '@ionic/vue'
import {useStoredState} from '../composables/useStoredState'

const [notifications, setNotifications] = useStoredState(
	'settings.notifications',
	true,
)
const [haptics, setHaptics] = useStoredState('settings.haptics', true)
const [darkMode, setDarkMode] = useStoredState('settings.darkMode', false)
</script>
