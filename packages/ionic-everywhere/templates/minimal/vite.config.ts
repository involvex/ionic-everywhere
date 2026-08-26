import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'
import {VitePWA} from 'vite-plugin-pwa'

export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['icons/pwa-192.png', 'icons/pwa-512.png'],
			manifest: {
				name: '__APP_NAME__',
				short_name: '__APP_NAME_KEBAB__',
				description: '__APP_NAME__ - built with @involvex/ionic-everywhere',
				lang: 'en',
				start_url: '.',
				scope: './',
				display: 'standalone',
				background_color: '#ffffff',
				theme_color: '#3880ff',
				icons: [
					{
						src: 'icons/pwa-192.png',
						sizes: '192x192',
						type: 'image/png',
					},
					{
						src: 'icons/pwa-512.png',
						sizes: '512x512',
						type: 'image/png',
					},
					{
						src: 'icons/maskable-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable',
					},
				],
			},
			workbox: {
				maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
			},
		}),
	],
	base: './',
})
