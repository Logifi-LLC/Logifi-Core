import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import FcvSync from '../../app/components/fcv/FcvSync.vue'

const apiFetchMock = vi.fn()

vi.mock('~/composables/useAuth', async () => {
  const { ref } = await import('vue')
  return {
    useAuth: () => ({
      session: ref({ access_token: 'token' }),
      isAuthenticated: ref(true),
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

vi.mock('~/utils/apiFetch', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
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
    training_elements: 'SMITH, JOHN',
    training_instructor: 'FO',
    ...overrides,
  }
}

function mountFcvSync(catalogPersonNames: string[] = ['John Smith', 'Amy Beta']) {
  return mount(FcvSync, {
    props: {
      isDarkMode: false,
      mode: 'fetch',
      catalogPersonNames,
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

function getSetupState(wrapper: ReturnType<typeof mountFcvSync>) {
  return (wrapper.vm as { $: { setupState: Record<string, unknown> } }).$.setupState
}

describe('FcvSync proactive pilot editing', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
  })

  it('shows Other pilot field for selected preview rows', async () => {
    const wrapper = mountFcvSync()
    const setupState = getSetupState(wrapper)
    setupState.connected = true
    setupState.previewFlights = [buildPreviewFlight()]
    setupState.showPreviewModal = true
    setupState.selectedFcvFlightIds = new Set(['fcv-1'])
    const init = setupState.initPerFlightCrewNames as () => void
    init()
    await nextTick()

    expect(wrapper.text()).toContain('Other pilot')
    expect(wrapper.text()).toContain('Search your full pilot catalog')
  })

  it('buildCrewOverridePayloads sends overrides for all selected flights', async () => {
    const wrapper = mountFcvSync(['John Smith'])
    const setupState = getSetupState(wrapper)
    setupState.previewFlights = [
      buildPreviewFlight({ fcv_flight_id: 'fcv-1', training_elements: 'SMITH, JOHN' }),
      buildPreviewFlight({ fcv_flight_id: 'fcv-2', training_elements: 'DOE, JANE' }),
    ]
    setupState.selectedFcvFlightIds = new Set(['fcv-1', 'fcv-2'])
    const init = setupState.initPerFlightCrewNames as () => void
    init()
    setupState.perFlightCrewName = {
      'fcv-1': 'John Smith',
      'fcv-2': 'New Person',
    }
    await nextTick()

    const build = setupState.buildCrewOverridePayloads as () => {
      crewNameOverrides: Record<string, string>
      crewOverrideModes: Record<string, string>
    }
    const payload = build()

    expect(payload.crewNameOverrides).toEqual({
      'fcv-1': 'John Smith',
      'fcv-2': 'New Person',
    })
    expect(payload.crewOverrideModes['fcv-1']).toBe('pick')
    expect(payload.crewOverrideModes['fcv-2']).toBe('rename')
  })

  it('isCrewReviewRowResolved accepts names from the full catalog list', async () => {
    const wrapper = mountFcvSync(['Catalog Person'])
    const setupState = getSetupState(wrapper)
    setupState.crewReviewCatalogNames = ['Catalog Person']
    setupState.crewResolutionMode = { 'RAW NAME': 'pick' }
    setupState.crewPickSelection = { 'RAW NAME': 'Catalog Person' }

    const isResolved = setupState.isCrewReviewRowResolved as (c: {
      fcv_flight_id: string
      raw_name: string
      normalized_key: string
      suggested_name: string | null
      candidates: string[]
      strategy: 'ambiguous'
    }) => boolean

    expect(
      isResolved({
        fcv_flight_id: 'fcv-9',
        raw_name: 'RAW NAME',
        normalized_key: 'raw name',
        suggested_name: null,
        candidates: ['Other Suggestion'],
        strategy: 'ambiguous',
      })
    ).toBe(true)
  })
})

describe('FcvSync import teardown', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
  })

  it('closes preview before emitting imported on success', async () => {
    apiFetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/fcv/status') return { connected: true }
      if (url === '/api/fcv/import') return { success: true, imported: 1, linked: 0, skipped: 0 }
      return {}
    })

    const wrapper = mountFcvSync()
    const setupState = getSetupState(wrapper)
    setupState.connected = true
    setupState.previewFlights = [buildPreviewFlight()]
    setupState.showPreviewModal = true
    setupState.selectedFcvFlightIds = new Set(['fcv-1'])
    const init = setupState.initPerFlightCrewNames as () => void
    init()
    await nextTick()

    const confirmImport = setupState.confirmImport as () => Promise<void>
    await confirmImport()
    await nextTick()

    expect(setupState.showPreviewModal).toBe(false)
    expect(wrapper.emitted('imported')).toBeTruthy()
  })

  it('stores catalog_person_names when crew review is required', async () => {
    apiFetchMock.mockResolvedValue({
      success: false,
      requires_crew_review: true,
      review_candidates: [
        {
          fcv_flight_id: 'fcv-1',
          raw_name: 'SMITH, JOHN',
          normalized_key: 'john smith',
          suggested_name: null,
          candidates: ['SMITH, JOHN'],
          strategy: 'ambiguous',
        },
      ],
      catalog_person_names: ['Amy Beta', 'John Smith'],
    })

    const wrapper = mountFcvSync()
    const setupState = getSetupState(wrapper)
    setupState.previewFlights = [buildPreviewFlight()]
    setupState.showPreviewModal = true
    setupState.selectedFcvFlightIds = new Set(['fcv-1'])
    const init = setupState.initPerFlightCrewNames as () => void
    init()

    const confirmImport = setupState.confirmImport as () => Promise<void>
    await confirmImport()
    await nextTick()

    expect(setupState.crewReviewCatalogNames).toEqual(['Amy Beta', 'John Smith'])
    expect(setupState.showPreviewModal).toBe(true)
    expect(wrapper.emitted('imported')).toBeFalsy()
  })
})
