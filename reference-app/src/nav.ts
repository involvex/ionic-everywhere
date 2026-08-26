import {listOutline, settingsOutline, speedometerOutline} from 'ionicons/icons'
import type {ComponentType} from 'react'
import DashboardPage from './pages/DashboardPage'
import ListPage from './pages/ListPage'
import SettingsPage from './pages/SettingsPage'

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
 * Single source of truth for navigation (FEAT-008): routes, tab buttons and
 * menu entries all derive from this list. Register a new page once here.
 */
export const NAV_ITEMS: NavItem[] = [
	{
		path: '/dashboard',
		label: 'Dashboard',
		icon: speedometerOutline,
		component: DashboardPage,
	},
	{
		path: '/list',
		label: 'List',
		icon: listOutline,
		component: ListPage,
	},
	{
		path: '/settings',
		label: 'Settings',
		icon: settingsOutline,
		component: SettingsPage,
	},
]

/** The app's home route - the first navigation entry. */
export const HOME_PATH = NAV_ITEMS[0]?.path ?? '/'
