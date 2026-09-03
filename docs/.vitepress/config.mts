import {defineConfig} from 'vitepress'

// Project page: https://involvex.github.io/ionic-everywhere/
// The base prefix is required so assets resolve under the repo sub-path.
export default defineConfig({
	base: '/ionic-everywhere/',
	description:
		'One responsive Ionic React codebase that builds Web, Android and Desktop apps.',
	lang: 'en-US',
	lastUpdated: true,
	title: 'ionic-everywhere',
	themeConfig: {
		editLink: {
			pattern:
				'https://github.com/involvex/ionic-everywhere/edit/main/docs/:path',
			text: 'Edit this page on GitHub',
		},
		nav: [
			{text: 'Guide', link: '/guide/getting-started'},
			{text: 'CLI', link: '/cli/'},
			{text: 'Troubleshooting', link: '/troubleshooting'},
		],
		search: {provider: 'local'},
		sidebar: [
			{
				items: [
					{text: 'Getting started', link: '/guide/getting-started'},
					{text: 'Generated app', link: '/guide/generated-app'},
					{text: 'Platforms', link: '/guide/platforms'},
				],
				text: 'Guide',
			},
			{
				items: [
					{text: 'Overview', link: '/cli/'},
					{text: 'new', link: '/cli/new'},
					{text: 'add', link: '/cli/add'},
					{text: 'upgrade', link: '/cli/upgrade'},
					{text: 'sign', link: '/cli/sign'},
					{text: 'list', link: '/cli/list'},
					{text: 'doctor', link: '/cli/doctor'},
				],
				text: 'CLI',
			},
			{
				items: [{text: 'Troubleshooting', link: '/troubleshooting'}],
				text: 'Help',
			},
		],
		socialLinks: [
			{
				icon: 'github',
				link: 'https://github.com/involvex/ionic-everywhere',
			},
		],
	},
})
