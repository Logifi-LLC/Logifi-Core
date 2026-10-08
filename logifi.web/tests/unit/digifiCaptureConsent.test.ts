import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import DigifiCaptureZones from '~/components/digifi/DigifiCaptureZones.vue'

const ensureDigifiAiConsent = vi.hoisted(() => vi.fn())

vi.mock('~/composables/useDigifiAiConsent', () => ({
  useDigifiAiConsent: () => ({
    digifiAiConsentSheetOpen: ref(false),
    ensureDigifiAiConsent,
    acceptDigifiAiConsent: vi.fn(),
    declineDigifiAiConsent: vi.fn(),
  }),
}))

vi.mock('~/composables/useTheme', () => ({
  useTheme: () => ({ isDark: ref(false) }),
}))

function mountZones() {
  return mount(DigifiCaptureZones, {
    props: {
      uploadingSide: null,
      lastPreviewBySide: {},
    },
    global: {
      stubs: { DigifiAiConsentSheet: true },
    },
  })
}

describe('Digifi phone capture consent', () => {
  beforeEach(() => {
    ensureDigifiAiConsent.mockReset()
  })

  it('does not open the camera until Continue', async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    ensureDigifiAiConsent.mockResolvedValue(false)
    const wrapper = mountZones()

    const left = wrapper.get('button')
    expect(left.text()).toContain('Take photo - left page')
    await left.trigger('click')
    expect(ensureDigifiAiConsent).toHaveBeenCalledTimes(1)
    expect(click).not.toHaveBeenCalled()

    ensureDigifiAiConsent.mockResolvedValue(true)
    await left.trigger('click')
    expect(click).toHaveBeenCalledTimes(1)
    click.mockRestore()
  })

  it('does not upload a selected photo when consent is declined', async () => {
    ensureDigifiAiConsent.mockResolvedValue(false)
    const wrapper = mountZones()
    const input = wrapper.get('input')
    const file = new File(['page'], 'left.jpg', { type: 'image/jpeg' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })

    await input.trigger('change')
    expect(wrapper.emitted('selectFile')).toBeUndefined()

    ensureDigifiAiConsent.mockResolvedValue(true)
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    expect(wrapper.emitted('selectFile')?.[0]).toEqual(['left', file])
  })
})
