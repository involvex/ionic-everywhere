<template>
	<ion-page>
		<ion-header>
			<ion-toolbar>
				<ion-title>Dashboard</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content class="ion-padding">
			<ion-grid>
				<ion-row>
					<ion-col
						v-for="stat in stats"
						:key="stat.title"
						size="12"
						size-md="6"
						size-lg="4"
					>
						<ion-card>
							<ion-card-header>
								<ion-card-subtitle>{{ stat.subtitle }}</ion-card-subtitle>
								<ion-card-title>{{ stat.title }}</ion-card-title>
							</ion-card-header>
							<ion-card-content>{{ stat.content }}</ion-card-content>
						</ion-card>
					</ion-col>
				</ion-row>
			</ion-grid>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import {
	IonCard,
	IonCardContent,
	IonCardHeader,
	IonCardSubtitle,
	IonCardTitle,
	IonCol,
	IonContent,
	IonGrid,
	IonHeader,
	IonPage,
	IonRow,
	IonTitle,
	IonToolbar,
} from '@ionic/vue'

const stats = [
	{
		title: 'Web',
		subtitle: 'Browser / PWA',
		content: 'Deployed anywhere as static files.',
	},
	{
		title: 'Android',
		subtitle: 'Capacitor',
		content: 'Same build synced into a native WebView shell.',
	},
	{
		title: 'Desktop',
		subtitle: 'Electron',
		content: 'Windows, macOS and Linux from one source.',
	},
]
</script>
