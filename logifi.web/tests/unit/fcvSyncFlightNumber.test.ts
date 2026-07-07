import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import FcvSync from '../../app/components/fcv/FcvSync.vue'

vi.mock('~/composables/useAuth', async () => {
  const { ref } = await import('vue')
  return {
    useAuth: () => ({
      session: ref(null),
      isAuthenticated: ref(false),
    }),
  }
})

vi.mock('~/composables/useFcvUiLabel', async () => {
  const { ref } = await import('vue')
  return {
    useFcvUiLabel: () => ({
      showPill: ref(false),
      pillText: ref(''),
    }),
  }
})

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
}))

function buildPreviewFlight(overrides: Record<string, unknown> = {}) {
  return {
    fcv_flight_id: 'fcv-1',
    date: '2026-05-10',
    role: 'PIC',
    aircraft_category_class: 'AMEL',
    aircraft_make_model: 'ERJ-175',
    registration: 'N123LF',
    flight_number: null,
    departure: 'KSEA',
    destination: 'KPDX',
    flight_time: { total: 1.6 },
    ...overrides,
  }
}

function mountFcvSync() {
  return mount(FcvSync, {
    props: {
      isDarkMode: false,
      mode: 'fetch',
    },
    global: {
      stubs: {
        Icon: true,
        FcvApiDisclaimers: true,
        Teleport: true,
      },
    },
  })
}

function primePreviewModal(setupState: Record<string, unknown>, flights: ReturnType<typeof buildPreviewFlight>[]) {
  setupState.connected = true
  setupState.previewFlights = flights
  setupState.showPreviewModal = true
}

describe('FcvSync preview flight number', () => {
  it('shows the flight number badge when preview data includes one', async () => {
    const wrapper = mountFcvSync()
    const setupState = (wrapper.vm as { $: { setupState: Record<string, unknown> } }).$.setupState

    primePreviewModal(setupState, [buildPreviewFlight({ flight_number: '4321' })])
    await nextTick()

    expect(wrapper.text()).toContain('Flight 4321')
  })

  it('omits the flight number badge when the preview row has no flight number', async () => {
    const wrapper = mountFcvSync()
    const setupState = (wrapper.vm as { $: { setupState: Record<string, unknown> } }).$.setupState

    primePreviewModal(setupState, [buildPreviewFlight()])
    await nextTick()

    expect(wrapper.text()).not.toContain('Flight')
  })
})

describe('FcvSync compact fetch', () => {
  it('shows the primary Import new flights action in compact mode', async () => {
    const wrapper = mount(FcvSync, {
      props: {
        isDarkMode: false,
        mode: 'fetch',
        compact: true,
      },
      global: {
        stubs: {
          Icon: true,
          FcvApiDisclaimers: true,
          Teleport: true,
        },
      },
    })
    const setupState = (wrapper.vm as { $: { setupState: Record<string, unknown> } }).$.setupState
    setupState.connected = true
    await nextTick()
    expect(wrapper.text()).toContain('Import new flights')
    expect(wrapper.text()).toContain('Choose date range…')
  })
})

describe('FcvSync row selection', () => {
  it('importCount reflects selected rows only', async () => {
    const wrapper = mountFcvSync()
    const setupState = (wrapper.vm as { $: { setupState: Record<string, unknown> } }).$.setupState

    primePreviewModal(setupState, [
      buildPreviewFlight({ fcv_flight_id: 'fcv-1' }),
      buildPreviewFlight({ fcv_flight_id: 'fcv-2' }),
    ])
    setupState.selectedFcvFlightIds = new Set(['fcv-1'])
    await nextTick()

    expect(setupState.importCount).toBe(1)
  })

  it('deselecting a row lowers importCount', async () => {
    const wrapper = mountFcvSync()
    const setupState = (wrapper.vm as { $: { setupState: Record<string, unknown> } }).$.setupState

    setupState.previewFlights = [
      buildPreviewFlight({ fcv_flight_id: 'fcv-1' }),
      buildPreviewFlight({ fcv_flight_id: 'fcv-2' }),
    ]
    setupState.selectedFcvFlightIds = new Set(['fcv-1', 'fcv-2'])
    await nextTick()
    expect(setupState.importCount).toBe(2)

    const toggle = setupState.toggleFlightSelection as (id: string) => void
    toggle('fcv-2')
    await nextTick()
    expect(setupState.importCount).toBe(1)
  })
})
