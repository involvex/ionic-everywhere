import {homeOutline} from 'ionicons/icons'
import type {ComponentType} from 'react'
import DashboardPage from './pages/DashboardPage'

export interface NavItem {
	/** URL path - used as the route path, tab href and menu routerLink. */
	path: string
	/** Human label shown in the tab bar and side menu. */
	label: string
	/** Icon imported from `ionicons/icons`. */
	icon: string
	/** Page component rendered at this path (wrap content in <IonPage>). */
	component: ComponentType
}

/**
 * Single source of truth for navigation (FEAT-008 minimal variant).
 */
export const NAV_ITEMS: NavItem[] = [
	{
		path: '/home',
		label: 'Home',
		icon: homeOutline,
		component: DashboardPage,
	},
]

/** The app's home route - the first navigation entry. */
export const HOME_PATH = NAV_ITEMS[0]?.path ?? '/'
