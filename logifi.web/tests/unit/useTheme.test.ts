import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(event?: unknown) => void>()
  const media = {
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: vi.fn((_event: string, cb: (event?: unknown) => void) => {
      listeners.add(cb)
    }),
    removeEventListener: vi.fn((_event: string, cb: (event?: unknown) => void) => {
      listeners.delete(cb)
    }),
    addListener: vi.fn((cb: (event?: unknown) => void) => listeners.add(cb)),
    removeListener: vi.fn((cb: (event?: unknown) => void) => listeners.delete(cb)),
    setMatches(next: boolean) {
      media.matches = next
      listeners.forEach((cb) => cb())
    },
  }
  window.matchMedia = vi.fn().mockImplementation(() => media) as unknown as typeof window.matchMedia
  return media
}

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

  it('defaults to system and does not persist light on first visit', async () => {
    mockMatchMedia(false)
    const { useTheme } = await loadUseTheme()
    const { theme, isDark } = useTheme()
    expect(theme.value).toBe('system')
    expect(isDark.value).toBe(false)
    expect(localStorage.getItem('logifi-theme')).toBeNull()
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('honors a stored light or dark preference', async () => {
    localStorage.setItem('logifi-theme', 'dark')
    mockMatchMedia(false)
    const { useTheme } = await loadUseTheme()
    const { theme, isDark } = useTheme()
    expect(theme.value).toBe('dark')
    expect(isDark.value).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('follows prefers-color-scheme when preference is system', async () => {
    mockMatchMedia(true)
    const { useTheme } = await loadUseTheme()
    const { theme, isDark } = useTheme()
    expect(theme.value).toBe('system')
    expect(isDark.value).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('updates live when the OS appearance changes', async () => {
    const media = mockMatchMedia(false)
    const { useTheme } = await loadUseTheme()
    const { theme, isDark } = useTheme()
    expect(isDark.value).toBe(false)

    media.setMatches(true)
    expect(theme.value).toBe('system')
    expect(isDark.value).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('persists an explicit choice', async () => {
    mockMatchMedia(true)
    const { useTheme } = await loadUseTheme()
    const { setTheme, theme, isDark } = useTheme()
    setTheme('light')
    expect(theme.value).toBe('light')
    expect(isDark.value).toBe(false)
    expect(localStorage.getItem('logifi-theme')).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })
})
