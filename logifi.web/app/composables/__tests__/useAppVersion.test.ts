import { describe, expect, it, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { useAppVersion } from '../useAppVersion'

const isNative = vi.fn(() => false)
const getInfo = vi.fn()

vi.mock('~/composables/useCapacitorPlatform', () => ({
  isCapacitorNative: () => isNative(),
}))

vi.mock('@capacitor/app', () => ({
  App: { getInfo },
}))

describe('useAppVersion', () => {
  beforeEach(() => {
    isNative.mockReturnValue(false)
    getInfo.mockReset()
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: { gitCommitSha: '' },
    }))
  })

  function mountHarness() {
    let versionLabel: { value: string } | undefined
    const Harness = defineComponent({
      setup() {
        const result = useAppVersion()
        versionLabel = result.versionLabel
        return { versionLabel: result.versionLabel }
      },
      template: '<span>{{ versionLabel }}</span>',
    })
    mount(Harness)
    return versionLabel!
  }

  it('initializes to fallback label before mount hooks run', () => {
    const { versionLabel } = useAppVersion()
    expect(versionLabel.value).toBe('Logifi 1.0.0')
  })

  it('resolves web label with SHA on mount', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: { gitCommitSha: 'abcdef0123456789' },
    }))

    const label = mountHarness()
    await flushPromises()
    expect(label.value).toBe('Logifi 1.0.0 (abcdef0)')
  })

  it('uses native App.getInfo on Capacitor', async () => {
    isNative.mockReturnValue(true)
    getInfo.mockResolvedValue({ version: '1.0', build: '8' })

    const label = mountHarness()
    await flushPromises()
    expect(getInfo).toHaveBeenCalled()
    expect(label.value).toBe('Logifi 1.0 (8)')
  })

  it('keeps fallback when native getInfo throws', async () => {
    isNative.mockReturnValue(true)
    getInfo.mockRejectedValue(new Error('native unavailable'))

    const label = mountHarness()
    await flushPromises()
    expect(label.value).toBe('Logifi 1.0.0')
  })
})