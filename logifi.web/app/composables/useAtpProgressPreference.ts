import { ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import {
  ACCOUNT_SCOPED_STORAGE_KEYS,
  getScopedItem,
  setScopedItem,
  tryLocalStorageSetItem,
} from '~/utils/userScopedStorage'

const STORAGE_KEY = ACCOUNT_SCOPED_STORAGE_KEYS.SHOW_ATP_PROGRESS
const isBrowser = typeof window !== 'undefined'

/**
 * Totals-overview ATP/R-ATP progress panel (local-only, same storage pattern as FAR 117 lookbacks).
 * Default off when unset (unlike currency chips, which default on).
 */
export function useAtpProgressPreference() {
  const { user } = useAuth()
  /** Null until loaded; default off when unset. */
  const showAtpProgress = ref<boolean | null>(null)

  function loadAtpProgressPreference(): void {
    if (!isBrowser) return
    const userId = user.value?.id
    const saved = userId
      ? getScopedItem(STORAGE_KEY, userId)
      : window.localStorage.getItem(STORAGE_KEY)
    showAtpProgress.value = saved === '1' || saved === 'true'
  }

  function saveAtpProgressPreference(enabled: boolean): void {
    showAtpProgress.value = enabled
    if (!isBrowser) return
    const value = enabled ? '1' : '0'
    const userId = user.value?.id
    if (userId) {
      setScopedItem(STORAGE_KEY, userId, value)
      return
    }
    tryLocalStorageSetItem(STORAGE_KEY, value)
  }

  function toggleAtpProgress(): void {
    saveAtpProgressPreference(showAtpProgress.value !== true)
  }

  return {
    showAtpProgress,
    loadAtpProgressPreference,
    saveAtpProgressPreference,
    toggleAtpProgress,
  }
}