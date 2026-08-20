import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

async function loadUseTheme() {
  vi.resetModules()
  const state = new Map<string, ReturnType<typeof ref>>()
  vi.stubGlobal('useState', (key: string, init: () => unknown) => {
    if (!state.has(key)) {
      state.set(key, ref(typeof init === 'function' ? init() : init))
    }
    return state.get(key)
  })
  return import('../../app/composables/useTheme')
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('defaults to light and does not persist on first visit', async () => {
    const { useTheme } = await loadUseTheme()
    const { theme, isDark } = useTheme()
    expect(theme.value).toBe('light')
    expect(isDark.value).toBe(false)
    expect(localStorage.getItem('logifi-theme')).toBeNull()
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('honors a stored light or dark preference', async () => {
    localStorage.setItem('logifi-theme', 'dark')
    const { useTheme } = await loadUseTheme()
    const { theme, isDark } = useTheme()
    expect(theme.value).toBe('dark')
    expect(isDark.value).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('migrates leftover system preference to light', async () => {
    localStorage.setItem('logifi-theme', 'system')
    localStorage.setItem('theme', 'system')
    const { useTheme } = await loadUseTheme()
    const { theme, isDark } = useTheme()
    expect(theme.value).toBe('light')
    expect(isDark.value).toBe(false)
    expect(localStorage.getItem('logifi-theme')).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('ignores OS prefers-color-scheme', async () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })) as unknown as typeof window.matchMedia

    const { useTheme } = await loadUseTheme()
    const { theme, isDark } = useTheme()
    expect(theme.value).toBe('light')
    expect(isDark.value).toBe(false)
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('persists an explicit choice', async () => {
    const { useTheme } = await loadUseTheme()
    const { setTheme, theme, isDark } = useTheme()
    setTheme('dark')
    expect(theme.value).toBe('dark')
    expect(isDark.value).toBe(true)
    expect(localStorage.getItem('logifi-theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    setTheme('light')
    expect(theme.value).toBe('light')
    expect(isDark.value).toBe(false)
    expect(localStorage.getItem('logifi-theme')).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })
})
