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
} from '@ionic/react'
import {addOutline, trashOutline} from 'ionicons/icons'
import React, {useState} from 'react'
import {useStoredState} from '../hooks/useStoredState'

interface ListItem {
	id: number
	name: string
}

const ListPage: React.FC = () => {
	const [items, setItems] = useStoredState<ListItem[]>('list.items', [])
	const [draft, setDraft] = useState('')

	const add = () => {
		const name = draft.trim()
		if (!name) return
		setItems(prev => [...prev, {id: Date.now(), name}])
		setDraft('')
	}

	const remove = (id: number) =>
		setItems(prev => prev.filter(item => item.id !== id))

	return (
		<IonPage>
			<IonHeader>
				<IonToolbar>
					<IonTitle>List</IonTitle>
				</IonToolbar>
			</IonHeader>
			<IonContent>
				<IonList inset>
					<IonItem>
						<IonInput
							aria-label="New item"
							placeholder="Add an item…"
							value={draft}
							onIonInput={e => setDraft(e.detail.value ?? '')}
							onKeyDown={e => {
								if (e.key === 'Enter') add()
							}}
						/>
						<IonButton
							slot="end"
							fill="clear"
							disabled={!draft.trim()}
							onClick={add}
						>
							<IonIcon
								slot="icon-only"
								icon={addOutline}
							/>
						</IonButton>
					</IonItem>
				</IonList>
				<IonList inset>
					{items.map(item => (
						<IonItem key={item.id}>
							<IonLabel>{item.name}</IonLabel>
							<IonButton
								slot="end"
								fill="clear"
								color="danger"
								onClick={() => remove(item.id)}
							>
								<IonIcon
									slot="icon-only"
									icon={trashOutline}
								/>
							</IonButton>
						</IonItem>
					))}
					{items.length === 0 && (
						<IonItem lines="none">
							<IonNote>No items yet - add one above.</IonNote>
						</IonItem>
					)}
				</IonList>
			</IonContent>
		</IonPage>
	)
}

export default ListPage
