<template>
	<ion-app>
		<ion-split-pane
			content-id="main-content"
			when="xs"
		>
			<AppMenu />
			<ion-router-outlet id="main-content" />
		</ion-split-pane>
	</ion-app>
</template>

<script setup lang="ts">
import {IonApp, IonRouterOutlet, IonSplitPane} from '@ionic/vue'
import {watchEffect} from 'vue'
import AppMenu from './components/AppMenu.vue'
import {useStoredState} from './composables/useStoredState'

const [darkMode] = useStoredState('settings.darkMode', false)

watchEffect(() => {
	document.documentElement.classList.toggle('ion-palette-dark', darkMode.value)
})
</script>
