import { computed } from 'vue'

export type Theme = 'dark' | 'light'

const PRIMARY_STORAGE_KEY = 'logifi-theme'
const LEGACY_STORAGE_KEY = 'theme'

function readStoredTheme(): Theme | null {
  const raw =
    window.localStorage.getItem(PRIMARY_STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_STORAGE_KEY)
  if (raw === 'dark' || raw === 'light') {
    return raw
  }
  return null
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  const stored = readStoredTheme()
  if (stored) return stored

  // Preserve existing behavior: default to OS dark if preferred, otherwise light.
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }

  return 'light'
}

function applyDocumentTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.add('light')
  }
}

export function useTheme() {
  const theme = useState<Theme>('theme', () => {
    const initial = getInitialTheme()
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PRIMARY_STORAGE_KEY, initial)
      window.localStorage.setItem(LEGACY_STORAGE_KEY, initial)
      applyDocumentTheme(initial)
    }
    return initial
  })

  const isDark = computed(() => theme.value === 'dark')

  function setTheme(next: Theme) {
    if (theme.value === next) return
    theme.value = next
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PRIMARY_STORAGE_KEY, next)
      window.localStorage.setItem(LEGACY_STORAGE_KEY, next)
      applyDocumentTheme(next)
    }
  }

  // Ensure document class stays in sync even if state was hydrated server-side.
  if (typeof window !== 'undefined') {
    const stored = readStoredTheme()
    if (stored && stored !== theme.value) {
      theme.value = stored
      applyDocumentTheme(stored)
    } else {
      applyDocumentTheme(theme.value)
    }
  }

  return {
    theme,
    isDark,
    setTheme,
  }
}

