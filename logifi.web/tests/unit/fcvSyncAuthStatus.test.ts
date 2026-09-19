import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import FcvSync from '../../app/components/fcv/FcvSync.vue'

const apiFetchMock = vi.fn()
const sessionRef = ref<{ access_token: string } | null>(null)
const isAuthenticatedRef = ref(false)

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

describe('FcvSync FLICA status when auth settles', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
    sessionRef.value = null
    isAuthenticatedRef.value = false
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
})
