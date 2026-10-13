<template>
	<ion-menu
		content-id="main-content"
		type="overlay"
	>
		<ion-header>
			<ion-toolbar>
				<ion-title>__APP_NAME__</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content>
			<ion-list inset>
				<ion-list-header>Navigate</ion-list-header>
				<ion-menu-toggle
					v-for="item in NAV_ITEMS"
					:key="item.path"
					:auto-hide="false"
				>
					<ion-item
						button
						:router-link="item.path"
						detail
					>
						<ion-icon
							slot="start"
							:icon="item.icon"
						/>
						<ion-label>{{ item.label }}</ion-label>
					</ion-item>
				</ion-menu-toggle>
			</ion-list>
		</ion-content>
	</ion-menu>
</template>

<script setup lang="ts">
import {
	IonContent,
	IonHeader,
	IonIcon,
	IonItem,
	IonLabel,
	IonList,
	IonListHeader,
	IonMenu,
	IonMenuToggle,
	IonTitle,
	IonToolbar,
} from '@ionic/vue'
import {NAV_ITEMS} from '../nav'
</script>
