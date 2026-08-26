import {Preferences} from '@capacitor/preferences'
import {useCallback, useEffect, useState} from 'react'

const CHANGE_EVENT = 'ie-usestoredstate-change'

/**
 * State persisted through @capacitor/preferences (works on web, Android and
 * the Electron WebView). All hook instances sharing a key stay in sync.
 */
export function useStoredState<T>(
	key: string,
	initial: T,
): [T, (update: T | ((prev: T) => T)) => void] {
	const [state, setState] = useState<T>(initial)

	useEffect(() => {
		let alive = true
		void Preferences.get({key}).then(({value}) => {
			if (!alive || value === null) return
			try {
				setState(JSON.parse(value) as T)
			} catch {
				// corrupted entry - keep the initial value
			}
		})
		return () => {
			alive = false
		}
	}, [key])

	useEffect(() => {
		const refresh = (event: Event) => {
			if ((event as CustomEvent<string>).detail !== key) return
			void Preferences.get({key}).then(({value}) => {
				if (value === null) return
				try {
					setState(JSON.parse(value) as T)
				} catch {
					// ignore malformed writes from other instances
				}
			})
		}
		window.addEventListener(CHANGE_EVENT, refresh)
		return () => window.removeEventListener(CHANGE_EVENT, refresh)
	}, [key])

	const set = useCallback(
		(update: T | ((prev: T) => T)) => {
			setState(prev => {
				const next =
					typeof update === 'function' ? (update as (p: T) => T)(prev) : update
				void Preferences.set({key, value: JSON.stringify(next)}).then(() => {
					window.dispatchEvent(new CustomEvent(CHANGE_EVENT, {detail: key}))
				})
				return next
			})
		},
		[key],
	)

	return [state, set]
}
