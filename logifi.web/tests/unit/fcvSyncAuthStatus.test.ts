import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import FcvSync from '../../app/components/fcv/FcvSync.vue'

const apiFetchMock = vi.fn()
const sessionRef = ref<{ access_token: string } | null>(null)
const isAuthenticatedRef = ref(false)
const isOnlineRef = ref(true)

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    session: sessionRef,
    isAuthenticated: isAuthenticatedRef,
  }),
}))

vi.mock('~/composables/useFcvUiLabel', async () => {
  const { ref: vueRef } = await import('vue')
  return {
    useFcvUiLabel: () => ({
      showPill: vueRef(false),
      pillText: vueRef(''),
    }),
  }
})

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
}))

vi.mock('~/utils/apiFetch', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}))

vi.mock('~/composables/useOffline', () => ({
  useOffline: () => ({
    isOnline: isOnlineRef,
    connectivityReady: ref(true),
    isSyncing: ref(false),
    syncProgress: ref({ current: 0, total: 0, status: 'idle' as const }),
    checkOnlineStatus: vi.fn(),
    updateSyncProgress: vi.fn(),
    resetSyncProgress: vi.fn(),
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn(),
  }),
}))

describe('FcvSync FLICA status when auth settles', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
    sessionRef.value = null
    isAuthenticatedRef.value = false
    isOnlineRef.value = true
    apiFetchMock.mockResolvedValue({ connected: false })
  })

  it('checks FLICA status after isAuthenticated becomes true', async () => {
    const wrapper = mount(FcvSync, {
      props: { isDarkMode: false, mode: 'fetch' },
      global: { stubs: { Icon: true, Teleport: true } },
    })

    await nextTick()
    expect(apiFetchMock).not.toHaveBeenCalled()

    sessionRef.value = { access_token: 'token' }
    isAuthenticatedRef.value = true
    await nextTick()
    await flushPromises()

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/api/flica/status',
      expect.objectContaining({
        query: { airlineCode: 'RJET' },
      })
    )

    wrapper.unmount()
  })

  it('does not check FLICA status while offline', async () => {
    isOnlineRef.value = false
    sessionRef.value = { access_token: 'token' }
    isAuthenticatedRef.value = true

    const wrapper = mount(FcvSync, {
      props: { isDarkMode: false, mode: 'connect' },
      global: { stubs: { Icon: true, Teleport: true } },
    })

    await nextTick()
    await flushPromises()

    expect(apiFetchMock).not.toHaveBeenCalledWith('/api/flica/status', expect.anything())

    isOnlineRef.value = true
    await nextTick()
    await flushPromises()

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/api/flica/status',
      expect.objectContaining({
        query: { airlineCode: 'RJET' },
      })
    )

    wrapper.unmount()
  })

  it('uses a connected non-Republic airline when Republic is not connected', async () => {
    apiFetchMock.mockImplementation((url: string) => {
      if (String(url).includes('airline-affiliations')) {
        return Promise.resolve({ affiliations: [{ airlineCode: 'EDV' }] })
      }
      return Promise.resolve({ connected: true })
    })

    const wrapper = mount(FcvSync, {
      props: { isDarkMode: false, mode: 'fetch' },
      global: { stubs: { Icon: true, Teleport: true } },
    })

    sessionRef.value = { access_token: 'token' }
    isAuthenticatedRef.value = true
    await nextTick()
    await flushPromises()

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/api/flica/status',
      expect.objectContaining({
        query: { airlineCode: 'EDV' },
      })
    )
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('EDV')
    const optionText = wrapper.findAll('option').map((o) => o.text())
    expect(optionText[0]).toContain('Republic')
    expect(optionText.some((text) => text.includes('Endeavor Air'))).toBe(true)

    wrapper.unmount()
  })

  it('shows an unsupported-carrier notice when a saved affiliation requires airline SSO', async () => {
    apiFetchMock.mockImplementation((url: string) => {
      if (String(url).includes('airline-affiliations')) {
        return Promise.resolve({
          affiliations: [{ airlineCode: 'JIA', supported: false }],
        })
      }
      return Promise.resolve({ connected: false })
    })

    const wrapper = mount(FcvSync, {
      props: { isDarkMode: false, mode: 'connect' },
      global: { stubs: { Icon: true, Teleport: true } },
    })

    sessionRef.value = { access_token: 'token' }
    isAuthenticatedRef.value = true
    await nextTick()
    await flushPromises()

    const text = wrapper.text()
    expect(text).toMatch(/single sign-on/)
    expect(text).toContain('Disconnect')
    expect(wrapper.findAll('option').map((o) => o.text()).some((t) => t.includes('PSA'))).toBe(
      false
    )

    wrapper.unmount()
  })
})
