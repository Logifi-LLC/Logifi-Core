import { ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import {
  ACCOUNT_SCOPED_STORAGE_KEYS,
  getScopedItem,
  setScopedItem,
  tryLocalStorageSetItem,
} from '~/utils/userScopedStorage'

const STORAGE_KEY = ACCOUNT_SCOPED_STORAGE_KEYS.SHOW_FAR117_LOOKBACKS
const isBrowser = typeof window !== 'undefined'

export function useFar117LookbackPreference() {
  const { user } = useAuth()
  /** Null until loaded; default off when unset. */
  const showFar117Lookbacks = ref<boolean | null>(null)

  function loadFar117LookbackPreference(): void {
    if (!isBrowser) return
    const userId = user.value?.id
    const saved = userId
      ? getScopedItem(STORAGE_KEY, userId)
      : window.localStorage.getItem(STORAGE_KEY)
    showFar117Lookbacks.value = saved === '1' || saved === 'true'
  }

  function saveFar117LookbackPreference(enabled: boolean): void {
    showFar117Lookbacks.value = enabled
    if (!isBrowser) return
    const value = enabled ? '1' : '0'
    const userId = user.value?.id
    if (userId) {
      setScopedItem(STORAGE_KEY, userId, value)
      return
    }
    tryLocalStorageSetItem(STORAGE_KEY, value)
  }

  function toggleFar117Lookbacks(): void {
    saveFar117LookbackPreference(showFar117Lookbacks.value !== true)
  }

  return {
    showFar117Lookbacks,
    loadFar117LookbackPreference,
    saveFar117LookbackPreference,
    toggleFar117Lookbacks,
  }
}