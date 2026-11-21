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
    expect(versionLabel.value).toBe('Logifi 1.0.10')
  })

  it('resolves web label from LOGIFI_WEB_VERSION on mount', async () => {
    const label = mountHarness()
    await flushPromises()
    expect(label.value).toBe('Logifi 1.0.10')
  })

  it('uses native App.getInfo version only on Capacitor', async () => {
    isNative.mockReturnValue(true)
    getInfo.mockResolvedValue({ version: '1.0.10', build: '8' })

    const label = mountHarness()
    await flushPromises()
    expect(getInfo).toHaveBeenCalled()
    expect(label.value).toBe('Logifi 1.0.10')
  })

  it('keeps web fallback when native getInfo throws', async () => {
    isNative.mockReturnValue(true)
    getInfo.mockRejectedValue(new Error('native unavailable'))

    const label = mountHarness()
    await flushPromises()
    expect(label.value).toBe('Logifi 1.0.10')
  })
})