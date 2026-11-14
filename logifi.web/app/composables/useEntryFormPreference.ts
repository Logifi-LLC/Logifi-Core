import { ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import {
  ACCOUNT_SCOPED_STORAGE_KEYS,
  getScopedItem,
  setScopedItem,
  tryLocalStorageSetItem,
} from '~/utils/userScopedStorage'
import {
  DEFAULT_ENTRY_FORM_MODE,
  parseEntryFormMode,
  type EntryFormMode,
} from '~/utils/entryFormMode'

const STORAGE_KEY = ACCOUNT_SCOPED_STORAGE_KEYS.ENTRY_FORM_MODE
const isBrowser = typeof window !== 'undefined'

export function useEntryFormPreference() {
  const { user } = useAuth()
  const entryFormMode = ref<EntryFormMode>(DEFAULT_ENTRY_FORM_MODE)

  function loadEntryFormPreference(): void {
    if (!isBrowser) return
    const userId = user.value?.id
    const saved = userId
      ? getScopedItem(STORAGE_KEY, userId)
      : window.localStorage.getItem(STORAGE_KEY)
    entryFormMode.value = parseEntryFormMode(saved)
  }

  function setEntryFormMode(mode: EntryFormMode | string): void {
    entryFormMode.value = parseEntryFormMode(mode)
    if (!isBrowser) return
    const userId = user.value?.id
    if (userId) {
      setScopedItem(STORAGE_KEY, userId, entryFormMode.value)
      return
    }
    tryLocalStorageSetItem(STORAGE_KEY, entryFormMode.value)
  }

  return {
    entryFormMode,
    setEntryFormMode,
    loadEntryFormPreference,
  }
}
