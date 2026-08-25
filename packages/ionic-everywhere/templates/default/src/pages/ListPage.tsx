import {
	IonContent,
	IonHeader,
	IonItem,
	IonLabel,
	IonList,
	IonNote,
	IonPage,
	IonTitle,
	IonToolbar,
} from '@ionic/react'
import React from 'react'

const items = Array.from({length: 20}, (_, i) => ({
	id: i + 1,
	name: `Item ${i + 1}`,
}))

const ListPage: React.FC = () => (
	<IonPage>
		<IonHeader>
			<IonToolbar>
				<IonTitle>List</IonTitle>
			</IonToolbar>
		</IonHeader>
		<IonContent>
			<IonList inset>
				{items.map(item => (
					<IonItem key={item.id}>
						<IonLabel>{item.name}</IonLabel>
						<IonNote slot="end">#{item.id}</IonNote>
					</IonItem>
				))}
			</IonList>
		</IonContent>
	</IonPage>
)

export default ListPage
