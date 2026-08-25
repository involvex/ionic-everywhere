import {setupIonicReact} from '@ionic/react'
import React from 'react'
import {createRoot} from 'react-dom/client'
import App from './App'

import '@ionic/react/css/core.css'
import '@ionic/react/css/display.css'
import '@ionic/react/css/flex-utils.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/padding.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'

import './theme/variables.css'

setupIonicReact()

const container = document.getElementById('root')
const root = createRoot(container!)
root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
)
