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
import {listOutline, settingsOutline, speedometerOutline} from 'ionicons/icons'
import React from 'react'

interface MenuItem {
	title: string
	path: string
	icon: string
}

const menuItems: MenuItem[] = [
	{title: 'Dashboard', path: '/dashboard', icon: speedometerOutline},
	{title: 'List', path: '/list', icon: listOutline},
	{title: 'Settings', path: '/settings', icon: settingsOutline},
]

const AppMenu: React.FC = () => (
	<IonMenu
		contentId="main-content"
		type="overlay"
	>
		<IonHeader>
			<IonToolbar>
				<IonTitle>Ionic Everywhere</IonTitle>
			</IonToolbar>
		</IonHeader>
		<IonContent>
			<IonList inset>
				<IonListHeader>Navigate</IonListHeader>
				{menuItems.map(item => (
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
							<IonLabel>{item.title}</IonLabel>
						</IonItem>
					</IonMenuToggle>
				))}
			</IonList>
		</IonContent>
	</IonMenu>
)

export default AppMenu
