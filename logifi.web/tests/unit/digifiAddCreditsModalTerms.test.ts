import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import DigifiAddCreditsModal from '../../app/components/digifi/DigifiAddCreditsModal.vue'

const webPayments = vi.hoisted(() => ({ enabled: true }))
const iapAvailable = vi.hoisted(() => ({ enabled: false }))

vi.mock('~/composables/useTheme', () => ({
  useTheme: () => ({ isDark: ref(false) }),
}))

vi.mock('~/composables/useDigifiCredits', () => ({
  useDigifiCredits: () => ({
    purchaseCredits: vi.fn(),
    pollLightningInvoiceStatus: vi.fn(),
    fetchBalance: vi.fn(),
    isPurchaseValid: () => true,
    calculateTotalDollars: () => 2,
    minPagesForMethod: () => 1,
    rateDollarsForMethod: () => 0.4,
  }),
}))

vi.mock('~/composables/useIapPurchase', () => ({
  useIapPurchase: () => ({
    isAvailable: ref(iapAvailable.enabled),
    products: ref([
      {
        productId: 'credits_25',
        label: '25 credits',
        credits: 25,
        price: '$12.99',
        available: true,
      },
    ]),
    initialize: vi.fn(),
    purchaseProduct: vi.fn(),
    loading: ref(false),
    error: ref(null),
  }),
}))

vi.mock('~/utils/platform', () => ({
  canUseWebPayments: () => webPayments.enabled,
}))

function mountModal() {
  return mount(DigifiAddCreditsModal, {
    props: { isOpen: true },
    attachTo: document.body,
    global: {
      stubs: {
        Teleport: true,
        Icon: true,
        NuxtLink: {
          props: ['to'],
          template: '<a :href="to"><slot /></a>',
        },
      },
    },
  })
}

describe('Digifi add-credits checkout agreement', () => {
  it('links Terms and Privacy under Proceed to Payment', () => {
    webPayments.enabled = true
    iapAvailable.enabled = false
    const wrapper = mountModal()

    expect(wrapper.text()).toContain('Proceed to Payment')
    expect(wrapper.text()).not.toContain('Purchase with Apple')
    expect(wrapper.text()).toContain('By purchasing, you agree to the Terms and Privacy Policy.')
    expect(wrapper.get('a[href="/terms"]').text()).toBe('Terms')
    expect(wrapper.get('a[href="/privacy"]').text()).toBe('Privacy Policy')
    wrapper.unmount()
  })

  it('links Terms and Privacy under Purchase with Apple', () => {
    webPayments.enabled = false
    iapAvailable.enabled = true
    const wrapper = mountModal()

    expect(wrapper.text()).toContain('Purchase with Apple')
    expect(wrapper.text()).not.toContain('Proceed to Payment')
    expect(wrapper.text()).toContain('By purchasing, you agree to the Terms and Privacy Policy.')
    expect(wrapper.get('a[href="/terms"]').text()).toBe('Terms')
    expect(wrapper.get('a[href="/privacy"]').text()).toBe('Privacy Policy')
    wrapper.unmount()
  })
})
