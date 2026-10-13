import {
	listOutline,
	settingsOutline,
	speedometerOutline,
} from 'ionicons/icons'
import type {Component} from 'vue'
import DashboardPage from './views/DashboardPage.vue'
import ListPage from './views/ListPage.vue'
import SettingsPage from './views/SettingsPage.vue'

export interface NavItem {
	path: string
	label: string
	icon: string
	component: Component
}

/** Single source of truth for navigation (routes, tabs, menu). */
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

export const HOME_PATH = NAV_ITEMS[0]?.path ?? '/'
