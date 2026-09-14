import {defineConfig} from 'vitest/config'

export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		environment: 'node',
		testTimeout: 20000,
		coverage: {
			provider: 'v8',
			include: ['packages/ionic-everywhere/src/**/*.ts'],
			exclude: ['**/node_modules/**', '**/dist/**'],
		},
	},
})
