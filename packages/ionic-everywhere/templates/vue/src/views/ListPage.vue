<template>
	<ion-page>
		<ion-header>
			<ion-toolbar>
				<ion-title>List</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content>
			<ion-list inset>
				<ion-item>
					<ion-input
						aria-label="New item"
						placeholder="Add an item…"
						v-model="draft"
						@keydown.enter="add"
					/>
					<ion-button
						slot="end"
						fill="clear"
						:disabled="!draft.trim()"
						@click="add"
					>
						<ion-icon
							slot="icon-only"
							:icon="addOutline"
						/>
					</ion-button>
				</ion-item>
			</ion-list>
			<ion-list inset>
				<ion-item
					v-for="item in items"
					:key="item.id"
				>
					<ion-label>{{ item.name }}</ion-label>
					<ion-button
						slot="end"
						fill="clear"
						color="danger"
						@click="remove(item.id)"
					>
						<ion-icon
							slot="icon-only"
							:icon="trashOutline"
						/>
					</ion-button>
				</ion-item>
				<ion-item
					v-if="items.length === 0"
					lines="none"
				>
					<ion-note>No items yet - add one above.</ion-note>
				</ion-item>
			</ion-list>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import {
	IonButton,
	IonContent,
	IonHeader,
	IonIcon,
	IonInput,
	IonItem,
	IonLabel,
	IonList,
	IonNote,
	IonPage,
	IonTitle,
	IonToolbar,
} from '@ionic/vue'
import {addOutline, trashOutline} from 'ionicons/icons'
import {ref} from 'vue'
import {useStoredState} from '../composables/useStoredState'

interface ListItem {
	id: number
	name: string
}

const [items, setItems] = useStoredState<ListItem[]>('list.items', [])
const draft = ref('')

const add = () => {
	const name = draft.value.trim()
	if (!name) return
	setItems(prev => [...prev, {id: Date.now(), name}])
	draft.value = ''
}

const remove = (id: number) =>
	setItems(prev => prev.filter(item => item.id !== id))
</script>
