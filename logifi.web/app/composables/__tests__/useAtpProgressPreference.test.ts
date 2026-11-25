import { describe, expect, it, beforeEach } from 'vitest'
import { useAtpProgressPreference } from '../useAtpProgressPreference'
import { ACCOUNT_SCOPED_STORAGE_KEYS } from '~/utils/userScopedStorage'

describe('useAtpProgressPreference', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults off when unset', () => {
    const { showAtpProgress, loadAtpProgressPreference } = useAtpProgressPreference()
    loadAtpProgressPreference()
    expect(showAtpProgress.value).toBe(false)
  })

  it('persists enabled to local storage', () => {
    const { saveAtpProgressPreference, loadAtpProgressPreference, showAtpProgress } =
      useAtpProgressPreference()
    saveAtpProgressPreference(true)
    showAtpProgress.value = null
    loadAtpProgressPreference()
    expect(showAtpProgress.value).toBe(true)
    expect(window.localStorage.getItem(ACCOUNT_SCOPED_STORAGE_KEYS.SHOW_ATP_PROGRESS)).toBe('1')
  })
})