import {shallowMount} from '@vue/test-utils'
import {describe, expect, it} from 'vitest'
import App from './App.vue'

describe('<App />', () => {
	it('mounts without crashing', () => {
		const wrapper = shallowMount(App)
		expect(wrapper.exists()).toBe(true)
	})
})
