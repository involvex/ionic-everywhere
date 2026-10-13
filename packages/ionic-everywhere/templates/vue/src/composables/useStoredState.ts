import {Preferences} from '@capacitor/preferences'
import {onMounted, onUnmounted, ref, type Ref} from 'vue'

const CHANGE_EVENT = 'ie-usestoredstate-change'

/**
 * State persisted through @capacitor/preferences (web, Android, Electron).
 */
export function useStoredState<T>(
	key: string,
	initial: T,
): [Ref<T>, (update: T | ((prev: T) => T)) => void] {
	const state = ref(initial) as Ref<T>

	const refresh = (): void => {
		void Preferences.get({key}).then(({value}) => {
			if (value === null) return
			try {
				state.value = JSON.parse(value) as T
			} catch {
				// corrupted entry - keep current value
			}
		})
	}

	const onChange = (event: Event) => {
		if ((event as CustomEvent<string>).detail !== key) return
		refresh()
	}

	onMounted(() => {
		refresh()
		window.addEventListener(CHANGE_EVENT, onChange)
	})
	onUnmounted(() => window.removeEventListener(CHANGE_EVENT, onChange))

	const set = (update: T | ((prev: T) => T)): void => {
		const next =
			typeof update === 'function'
				? (update as (p: T) => T)(state.value)
				: update
		state.value = next
		void Preferences.set({key, value: JSON.stringify(next)}).then(() => {
			window.dispatchEvent(new CustomEvent(CHANGE_EVENT, {detail: key}))
		})
	}

	return [state, set]
}
