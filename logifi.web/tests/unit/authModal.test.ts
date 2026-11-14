import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { nextTick, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import AuthModal from '../../app/components/AuthModal.vue'

const signUp = vi.hoisted(() => vi.fn())
const signIn = vi.hoisted(() => vi.fn())
const resendSignupConfirmation = vi.hoisted(() => vi.fn())

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    signUp,
    signIn,
    signInWithGoogle: vi.fn(),
    signInWithApple: vi.fn(),
    resetPassword: vi.fn(),
    resendSignupConfirmation,
    isLoading: ref(false),
    error: ref<string | null>(null),
  }),
}))

vi.mock('~/composables/useCapacitorPlatform', () => ({
  isCapacitorIos: () => false,
  resetIosInputZoom: vi.fn(),
}))

vi.mock('~/utils/referralCapture', () => ({
  captureReferralFromSearch: () => null,
  clearStoredReferralCode: vi.fn(),
  readStoredReferralCode: () => null,
  storeReferralCode: vi.fn(),
}))

function mountModal(
  props?: Record<string, unknown>,
  options?: { attachTo?: HTMLElement }
) {
  return mount(AuthModal, {
    props: { initialTab: 'signup', ...props },
    attachTo: options?.attachTo ?? document.body,
    global: {
      stubs: {
        Icon: true,
        LogifiAppLogo: true,
        NuxtLink: {
          props: ['to'],
          template: '<a :href="to"><slot /></a>',
        },
      },
    },
  })
}

describe('AuthModal signup validation and focus', () => {
  beforeEach(() => {
    signUp.mockReset()
    signIn.mockReset()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('surfaces email and 6-character password errors on submit without calling signUp', async () => {
    const wrapper = mountModal()
    const email = wrapper.get('#email')
    const password = wrapper.get('#password')

    await email.setValue('not-an-email')
    await password.setValue('abc')
    await wrapper.get('button.w-full.py-4').trigger('click')
    await flushPromises()
    await nextTick()

    expect(wrapper.get('#auth-email-error').text()).toBe('Enter a valid email address')
    expect(wrapper.get('#auth-password-error').text()).toBe(
      'Password must be at least 6 characters'
    )
    expect(email.attributes('aria-describedby')).toBe('auth-email-error')
    expect(password.attributes('aria-describedby')).toBe('auth-password-error')
    expect(email.attributes('aria-invalid')).toBe('true')
    expect(password.attributes('aria-invalid')).toBe('true')
    expect(signUp).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('shows the password rule on blur before submit', async () => {
    const wrapper = mountModal()
    const password = wrapper.get('#password')
    await password.setValue('hey')
    await password.trigger('blur')
    await nextTick()

    expect(wrapper.get('#auth-password-error').text()).toBe(
      'Password must be at least 6 characters'
    )
    expect(signUp).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('uses new-password autocomplete on sign-up and current-password on sign-in', async () => {
    const wrapper = mountModal()
    expect(wrapper.get('#password').attributes('autocomplete')).toBe('new-password')

    const signInTab = wrapper.findAll('button').find((button) => button.text() === 'Sign In')
    expect(signInTab).toBeTruthy()
    await signInTab!.trigger('click')
    await nextTick()
    expect(wrapper.get('#password').attributes('autocomplete')).toBe('current-password')
    wrapper.unmount()
  })

  it('traps focus inside the dialog and restores it on close', async () => {
    const opener = document.createElement('button')
    opener.type = 'button'
    opener.textContent = 'Add entry'
    document.body.appendChild(opener)
    opener.focus()
    expect(document.activeElement).toBe(opener)

    const wrapper = mountModal()
    await nextTick()
    await nextTick()

    const dialog = wrapper.get('[role="dialog"]').element
    expect(dialog.contains(document.activeElement)).toBe(true)

    opener.focus()
    await nextTick()
    expect(dialog.contains(document.activeElement)).toBe(true)

    wrapper.unmount()
    await nextTick()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('calls signUp when email and password are valid', async () => {
    signUp.mockResolvedValue({ success: true, requiresEmailConfirmation: true })
    const wrapper = mountModal()
    await wrapper.get('#email').setValue('you@example.com')
    await wrapper.get('#password').setValue('secret1')
    await wrapper.get('button.w-full.py-4').trigger('click')
    await flushPromises()
    await nextTick()

    expect(signUp).toHaveBeenCalledWith('you@example.com', 'secret1')
    expect(wrapper.find('[data-testid="auth-check-inbox"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('you@example.com')
    wrapper.unmount()
  })

  it('shows resend guidance when sign-in reports unconfirmed email', async () => {
    signIn.mockResolvedValue({ success: false, error: 'Email not confirmed' })
    const wrapper = mountModal({ initialTab: 'signin' })
    await wrapper.get('#email').setValue('you@example.com')
    await wrapper.get('#password').setValue('secret12')
    await wrapper.get('button.w-full.py-4').trigger('click')
    await flushPromises()
    await nextTick()

    expect(wrapper.text()).toContain('Resend confirmation email')
    wrapper.unmount()
  })
})
