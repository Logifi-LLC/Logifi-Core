import { computed } from 'vue'

/** Stored appearance preference. Light/Dark only — no OS follow. */
export type Theme = 'light' | 'dark'

const PRIMARY_STORAGE_KEY = 'logifi-theme'
const LEGACY_STORAGE_KEY = 'theme'

function normalizeStoredTheme(raw: string | null): Theme | null {
  if (raw === 'dark' || raw === 'light') return raw
  // Legacy System preference → light so the segmented control stays valid.
  if (raw === 'system') return 'light'
  return null
}

function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  const raw =
    window.localStorage.getItem(PRIMARY_STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_STORAGE_KEY)
  return normalizeStoredTheme(raw)
}

function persistTheme(next: Theme) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PRIMARY_STORAGE_KEY, next)
  window.localStorage.setItem(LEGACY_STORAGE_KEY, next)
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const stored = readStoredTheme()
  if (stored) return stored

  return 'light'
}

function applyResolvedTheme(resolved: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  root.classList.add(resolved)
}

/** Apply light/dark class to `html`. */
export function applyDocumentTheme(next: Theme) {
  applyResolvedTheme(next)
}

export function useTheme() {
  const theme = useState<Theme>('theme', () => getInitialTheme())

  const isDark = computed(() => theme.value === 'dark')

  function setTheme(next: Theme) {
    if (theme.value === next) {
      applyDocumentTheme(next)
      return
    }
    theme.value = next
    persistTheme(next)
    applyDocumentTheme(next)
  }

  if (typeof window !== 'undefined') {
    const stored = readStoredTheme()
    if (stored && stored !== theme.value) {
      theme.value = stored
    }
    // Persist migration when leftover `system` was normalized to light.
    const rawPrimary = window.localStorage.getItem(PRIMARY_STORAGE_KEY)
    const rawLegacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (rawPrimary === 'system' || rawLegacy === 'system') {
      persistTheme(theme.value)
    }
    applyDocumentTheme(theme.value)
  }

  return {
    theme,
    isDark,
    setTheme,
    applyDocumentTheme,
  }
}
