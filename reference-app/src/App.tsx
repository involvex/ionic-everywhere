import {
	IonApp,
	IonIcon,
	IonLabel,
	IonRouterOutlet,
	IonSplitPane,
	IonTabBar,
	IonTabButton,
	IonTabs,
} from '@ionic/react'
import {IonReactRouter} from '@ionic/react-router'
import React from 'react'
import {Navigate, Route} from 'react-router-dom'
import AppMenu from './components/AppMenu'
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
				<IonSplitPane contentId="main-content">
					<AppMenu />
					<IonTabs>
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
						<IonTabBar slot="bottom">
							{NAV_ITEMS.map(item => (
								<IonTabButton
									key={item.path}
									tab={item.path.slice(1)}
									href={item.path}
								>
									<IonIcon
										aria-hidden="true"
										icon={item.icon}
									/>
									<IonLabel>{item.label}</IonLabel>
								</IonTabButton>
							))}
						</IonTabBar>
					</IonTabs>
				</IonSplitPane>
			</IonReactRouter>
		</IonApp>
	)
}

export default App
