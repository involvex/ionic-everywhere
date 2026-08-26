import {render} from '@testing-library/react'
import {describe, expect, it} from 'vitest'
import App from '../src/App'

describe('<App />', () => {
	it('renders without crashing', () => {
		const {container} = render(<App />)
		expect(container).toBeTruthy()
	})
})
