import { computed, ref } from 'vue'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'
/** Stored appearance preference. `system` follows the OS. */
export type Theme = ThemePreference

const PRIMARY_STORAGE_KEY = 'logifi-theme'
const LEGACY_STORAGE_KEY = 'theme'
const SYSTEM_MEDIA_QUERY = '(prefers-color-scheme: dark)'

const systemDark = ref(false)
let systemListenerBound = false

function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  const raw =
    window.localStorage.getItem(PRIMARY_STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_STORAGE_KEY)
  if (raw === 'dark' || raw === 'light' || raw === 'system') {
    return raw
  }
  return null
}

function persistTheme(next: Theme) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PRIMARY_STORAGE_KEY, next)
  window.localStorage.setItem(LEGACY_STORAGE_KEY, next)
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(SYSTEM_MEDIA_QUERY).matches
}

function readSystemDark(): boolean {
  systemDark.value = systemPrefersDark()
  return systemDark.value
}

export function resolveTheme(preference: Theme): ResolvedTheme {
  if (preference === 'light' || preference === 'dark') return preference
  return systemDark.value ? 'dark' : 'light'
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const stored = readStoredTheme()
  if (stored) return stored

  return 'system'
}

function applyResolvedTheme(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  root.classList.add(resolved)
}

/** Apply a stored preference or a resolved light/dark class to `html`. */
export function applyDocumentTheme(next: Theme | ResolvedTheme) {
  applyResolvedTheme(resolveTheme(next === 'system' ? 'system' : next))
}

function ensureSystemPreferenceListener(getPreference: () => Theme) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  if (systemListenerBound) return
  systemListenerBound = true
  const media = window.matchMedia(SYSTEM_MEDIA_QUERY)
  const onChange = () => {
    readSystemDark()
    if (getPreference() === 'system') {
      applyResolvedTheme(systemDark.value ? 'dark' : 'light')
    }
  }
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', onChange)
  } else if (typeof media.addListener === 'function') {
    media.addListener(onChange)
  }
}

export function useTheme() {
  const theme = useState<Theme>('theme', () => getInitialTheme())

  const isDark = computed(() => resolveTheme(theme.value) === 'dark')

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
    readSystemDark()
    const stored = readStoredTheme()
    if (stored && stored !== theme.value) {
      theme.value = stored
    }
    applyDocumentTheme(theme.value)
    ensureSystemPreferenceListener(() => theme.value)
  }

  return {
    theme,
    isDark,
    setTheme,
    applyDocumentTheme,
  }
}
