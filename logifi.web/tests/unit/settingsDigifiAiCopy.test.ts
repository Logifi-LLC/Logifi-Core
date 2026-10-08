import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import SettingsDigifiTab from '~/components/settings/tabs/SettingsDigifiTab.vue'
import { DIGIFI_AI_VERIFY_LINE } from '~/utils/digifiAiConsent'

vi.mock('~/composables/useCapacitorPlatform', () => ({
  useCapacitorPlatform: () => ({ isIos: ref(true) }),
}))

vi.mock('~/composables/useDigifiLearning', () => ({
  useDigifiLearning: () => ({
    isOptedIn: ref(false),
    isLoading: ref(false),
    loadOptInStatus: vi.fn(),
    setOptIn: vi.fn(),
    eraseDigifiLearningData: vi.fn(),
  }),
}))

vi.mock('~/composables/useDigifiDestination', () => ({
  useDigifiDestination: () => ({
    preferredSink: ref(null),
    loadPreferredSink: vi.fn(),
  }),
}))

vi.mock('~/composables/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('~/utils/digifiMobileReview', () => ({
  isDigifiMobileReviewEnabled: () => true,
}))

describe('Settings Digifi copy on iOS', () => {
  it('shows the AI verify line that used to be hidden on iOS', () => {
    const wrapper = mount(SettingsDigifiTab, {
      props: { isDarkMode: true },
      global: {
        stubs: {
          SettingsListRow: true,
          DigifiCreditsIndicator: true,
          DigifiCreditHistory: true,
          DigifiAddCreditsModal: true,
          Icon: true,
        },
      },
    })

    expect(wrapper.text()).toContain(DIGIFI_AI_VERIFY_LINE)
    expect(wrapper.text()).not.toContain('Digifi Eye still captures for desktop Start Scanning')
  })
})