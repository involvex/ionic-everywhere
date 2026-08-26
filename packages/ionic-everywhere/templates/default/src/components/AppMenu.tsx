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
} from '@ionic/react'
import React from 'react'
import {NAV_ITEMS} from '../nav'

const AppMenu: React.FC = () => (
	<IonMenu
		contentId="main-content"
		type="overlay"
	>
		<IonHeader>
			<IonToolbar>
				<IonTitle>__APP_NAME__</IonTitle>
			</IonToolbar>
		</IonHeader>
		<IonContent>
			<IonList inset>
				<IonListHeader>Navigate</IonListHeader>
				{NAV_ITEMS.map(item => (
					<IonMenuToggle
						key={item.path}
						autoHide={false}
					>
						<IonItem
							button
							routerLink={item.path}
							detail
						>
							<IonIcon
								slot="start"
								icon={item.icon}
							/>
							<IonLabel>{item.label}</IonLabel>
						</IonItem>
					</IonMenuToggle>
				))}
			</IonList>
		</IonContent>
	</IonMenu>
)

export default AppMenu
