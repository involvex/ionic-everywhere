import React from 'react'

interface ErrorBoundaryProps {
	children: React.ReactNode
}

interface ErrorBoundaryState {
	error: Error | null
}

/**
 * Keeps a crashing page from blanking the whole app: each route renders
 * inside its own boundary, so a broken screen shows a retry card while the
 * shell (menu, tabs) stays alive.
 */
class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	state: ErrorBoundaryState = {error: null}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return {error}
	}

	componentDidCatch(error: Error, info: React.ErrorInfo): void {
		console.error('Uncaught UI error:', error, info.componentStack)
	}

	render(): React.ReactNode {
		if (this.state.error) {
			return (
				<div
					style={{
						padding: '2rem',
						textAlign: 'center',
						fontFamily: 'system-ui, sans-serif',
					}}
				>
					<h2>Something went wrong</h2>
					<p style={{color: '#555'}}>{this.state.error.message}</p>
					<button onClick={() => this.setState({error: null})}>
						Try again
					</button>
				</div>
			)
		}
		return this.props.children
	}
}

export default ErrorBoundary
