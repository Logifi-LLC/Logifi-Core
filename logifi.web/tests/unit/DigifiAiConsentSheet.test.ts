import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import DigifiAiConsentSheet from '~/components/digifi/DigifiAiConsentSheet.vue'
import {
  resetDigifiAiConsentForTests,
  useDigifiAiConsent,
} from '~/composables/useDigifiAiConsent'
import {
  DIGIFI_AI_CONSENT_BODY,
  DIGIFI_AI_CONSENT_TITLE,
} from '~/utils/digifiAiConsent'

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({ user: { value: { id: 'pilot-a' } } }),
}))

vi.mock('~/composables/useTheme', () => ({
  useTheme: () => ({ isDark: ref(false) }),
}))

describe('DigifiAiConsentSheet', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    resetDigifiAiConsentForTests()
  })

  it('shows the disclosure, policy links, and cancels until Continue', async () => {
    const wrapper = mount(DigifiAiConsentSheet, {
      attachTo: document.body,
      global: {
        stubs: {
          NuxtLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    })

    const { ensureDigifiAiConsent } = useDigifiAiConsent()
    const pending = ensureDigifiAiConsent()
    await vi.waitFor(() => {
      expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    })

    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.textContent).toContain(DIGIFI_AI_CONSENT_TITLE)
    expect(dialog?.textContent).toContain(DIGIFI_AI_CONSENT_BODY)
    expect(document.querySelector('a[href="/privacy"]')?.textContent).toContain('Privacy')
    expect(document.querySelector('a[href="/terms"]')?.textContent).toContain('Terms')

    const notNow = [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Not now'))
    notNow?.click()
    await expect(pending).resolves.toBe(false)
    await nextTick()
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    const again = ensureDigifiAiConsent()
    await vi.waitFor(() => {
      expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    })
    const continueButton = [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Continue'))
    continueButton?.click()
    await expect(again).resolves.toBe(true)
    await nextTick()
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    await expect(ensureDigifiAiConsent()).resolves.toBe(true)
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    wrapper.unmount()
  })
})
