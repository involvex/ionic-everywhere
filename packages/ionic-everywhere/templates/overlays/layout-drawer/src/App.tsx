import {
	IonApp,
	IonContent,
	IonHeader,
	IonMenu,
	IonRouterOutlet,
	IonTitle,
	IonToolbar,
} from '@ionic/react'
import {IonReactRouter} from '@ionic/react-router'
import React from 'react'
import {Navigate, Route} from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import {useStoredState} from './hooks/useStoredState'
import {HOME_PATH, NAV_ITEMS} from './nav'

const App: React.FC = () => {
	const [darkMode] = useStoredState('settings.darkMode', false)

	React.useEffect(() => {
		document.documentElement.classList.toggle('ion-palette-dark', darkMode)
	}, [darkMode])

	return (
		<IonApp>
			<IonReactRouter>
				<IonMenu contentId="main-content">
					<IonHeader>
						<IonToolbar>
							<IonTitle>__APP_NAME__</IonTitle>
						</IonToolbar>
					</IonHeader>
					<IonContent>
						{NAV_ITEMS.map(item => (
							<a
								key={item.path}
								href={item.path}
								style={{display: 'block', padding: '1rem', textDecoration: 'none', color: 'inherit'}}
							>
								{item.label}
							</a>
						))}
					</IonContent>
				</IonMenu>
				<IonRouterOutlet id="main-content">
					<Route
						path="/"
						element={
							<Navigate
								to={HOME_PATH}
								replace
							/>
						}
					/>
					{NAV_ITEMS.map(item => (
						<Route
							key={item.path}
							path={item.path}
							element={
								<ErrorBoundary>
									<item.component />
								</ErrorBoundary>
							}
						/>
					))}
					<Route
						path="*"
						element={
							<Navigate
								to={HOME_PATH}
								replace
							/>
						}
					/>
				</IonRouterOutlet>
			</IonReactRouter>
		</IonApp>
	)
}

export default App
