import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { goBackInApp, inAppHistoryBack } from '../inAppBack'

const navigateTo = vi.hoisted(() => vi.fn())
vi.stubGlobal('navigateTo', navigateTo)

const APP_BACK_FILES = [
  'app/components/ios/IosAppPageShell.vue',
  'app/pages/endorsements.vue',
  'app/pages/totals-report.vue',
  'app/pages/logbook-check.vue',
  'app/pages/privacy.vue',
  'app/pages/terms.vue',
  'app/pages/data-sources.vue',
  'app/pages/developers.vue',
  'app/pages/feedback.vue',
]

describe('inAppHistoryBack', () => {
  it('accepts an in-app path and rejects a document reload', () => {
    expect(inAppHistoryBack({ back: '/dashboard' })).toBe('/dashboard')
    expect(inAppHistoryBack({ back: '/endorsements?from=dashboard' })).toBe('/endorsements?from=dashboard')
    expect(inAppHistoryBack({ back: null })).toBeNull()
    expect(inAppHistoryBack({})).toBeNull()
    expect(inAppHistoryBack(null)).toBeNull()
    expect(inAppHistoryBack({ back: 'https://logifi.io/dashboard' })).toBeNull()
    expect(inAppHistoryBack({ back: '//evil.example/dashboard' })).toBeNull()
  })

  beforeEach(() => {
    navigateTo.mockClear()
  })

  it('uses router.back only for an in-app entry', () => {
    const back = vi.fn()
    expect(goBackInApp({ back }, '/dashboard', { back: '/dashboard' })).toBe('back')
    expect(back).toHaveBeenCalledOnce()
    expect(navigateTo).not.toHaveBeenCalled()

    expect(goBackInApp({ back }, '/dashboard', { back: null })).toBe('fallback')
    expect(navigateTo).toHaveBeenCalledWith('/dashboard')
    expect(goBackInApp({ back }, '/', null)).toBe('fallback')
    expect(navigateTo).toHaveBeenCalledWith('/')
  })

  it('keeps app Back controls off history.length and hard navigations', () => {
    for (const file of APP_BACK_FILES) {
      const src = readFileSync(resolve(__dirname, '../../../', file), 'utf8')
      expect(src, file).not.toMatch(/history\.length/)
      expect(src, file).toContain('goBackInApp')
      expect(src, file).not.toMatch(/navigateTo\([^)]*external:\s*true/)
      expect(src, file).not.toContain('reloadNuxtApp')
    }
  })
})
