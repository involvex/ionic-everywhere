import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
	{
		ignores: ['dist/**', 'node_modules/**', 'android/**', 'electron/**'],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{argsIgnorePattern: '^_', varsIgnorePattern: '^_'},
			],
		},
	},
)
