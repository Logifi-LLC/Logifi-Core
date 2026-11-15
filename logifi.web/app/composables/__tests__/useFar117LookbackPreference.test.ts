import { describe, expect, it, beforeEach } from 'vitest'
import { useFar117LookbackPreference } from '../useFar117LookbackPreference'

describe('useFar117LookbackPreference', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults off when unset', () => {
    const { showFar117Lookbacks, loadFar117LookbackPreference } =
      useFar117LookbackPreference()
    loadFar117LookbackPreference()
    expect(showFar117Lookbacks.value).toBe(false)
  })

  it('persists when toggled on', () => {
    const pref = useFar117LookbackPreference()
    pref.loadFar117LookbackPreference()
    pref.toggleFar117Lookbacks()
    expect(pref.showFar117Lookbacks.value).toBe(true)

    const reloaded = useFar117LookbackPreference()
    reloaded.loadFar117LookbackPreference()
    expect(reloaded.showFar117Lookbacks.value).toBe(true)
  })
})