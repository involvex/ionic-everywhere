import {createRouter, createWebHistory} from '@ionic/vue-router'
import type {RouteRecordRaw} from 'vue-router'
import {HOME_PATH, NAV_ITEMS} from '../nav'

const routes: RouteRecordRaw[] = [
	{
		path: '/',
		redirect: HOME_PATH,
	},
	...NAV_ITEMS.map(item => ({
		path: item.path,
		component: item.component,
	})),
	{
		path: '/:pathMatch(.*)*',
		redirect: HOME_PATH,
	},
]

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
})

export default router
