<template>
	<ion-page>
		<ion-tabs>
			<ion-router-outlet />
			<ion-tab-bar slot="bottom">
				<ion-tab-button
					v-for="item in NAV_ITEMS"
					:key="item.path"
					:tab="item.path.slice(1)"
					:href="item.path"
				>
					<ion-icon
						aria-hidden="true"
						:icon="item.icon"
					/>
					<ion-label>{{ item.label }}</ion-label>
				</ion-tab-button>
			</ion-tab-bar>
		</ion-tabs>
	</ion-page>
</template>

<script setup lang="ts">
import {
	IonIcon,
	IonLabel,
	IonPage,
	IonRouterOutlet,
	IonTabBar,
	IonTabButton,
	IonTabs,
} from '@ionic/vue'
import {NAV_ITEMS} from '../nav'
</script>
