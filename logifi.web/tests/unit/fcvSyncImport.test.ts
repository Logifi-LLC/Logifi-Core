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

function mountFcvSync(
  catalogPersonNames: string[] = ['John Smith', 'Amy Beta'],
  extraProps: Record<string, unknown> = {}
) {
  return mount(FcvSync, {
    props: {
      isDarkMode: false,
      mode: 'fetch',
      catalogPersonNames,
      ...extraProps,
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

describe('FcvSync fetch omits already-in-logbook', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
  })

  it('hides already-imported flights from Fetch preview and reports count', async () => {
    apiFetchMock.mockImplementation(async (url: string, init?: { body?: unknown }) => {
      if (url === '/api/flica/status') return { connected: true, username: 'RPA1' }
      if (url === '/api/airline-sync/fetch-flica') {
        return {
          success: true,
          flights: [
            buildPreviewFlight({
              fcv_flight_id: 'FLICA_OLD',
              date: '2026-08-10',
              flight_number: '5772',
              departure: 'LGA',
              destination: 'DCA',
            }),
            buildPreviewFlight({
              fcv_flight_id: 'FLICA_20260812_4442_LGA',
              date: '2026-08-12',
              flight_number: '4442',
              departure: 'LGA',
              destination: 'RIC',
            }),
            buildPreviewFlight({
              fcv_flight_id: 'FLICA_20260812_4442_RIC',
              date: '2026-08-12',
              flight_number: '4442',
              departure: 'RIC',
              destination: 'LGA',
            }),
          ],
          count: 3,
        }
      }
      if (url === '/api/fcv/check-duplicates') {
        const body = init?.body as { flights?: Array<{ fcv_flight_id?: string }> } | undefined
        const flights = body?.flights ?? []
        if (flights.length === 3) {
          return {
            duplicateFcvFlightIds: [],
            duplicateIndices: [0],
            alreadyImportedIndices: [0],
            heuristicDuplicateIndices: [],
            alreadyImportedFcvFlightIds: ['FLICA_OLD'],
            heuristicMatches: [],
          }
        }
        return {
          duplicateFcvFlightIds: [],
          duplicateIndices: [],
          alreadyImportedIndices: [],
          heuristicDuplicateIndices: [],
          alreadyImportedFcvFlightIds: [],
          heuristicMatches: [],
        }
      }
      return {}
    })

    const wrapper = mountFcvSync()
    const setupState = getSetupState(wrapper)
    setupState.connected = true
    await nextTick()

    const fetchFlights = setupState.fetchFlights as () => Promise<void>
    await fetchFlights()
    await nextTick()

    const preview = setupState.previewFlights as Array<{ fcv_flight_id: string }>
    expect(preview.map((f) => f.fcv_flight_id)).toEqual([
      'FLICA_20260812_4442_LGA',
      'FLICA_20260812_4442_RIC',
    ])
    expect(setupState.sinceLastEntryOmittedAlreadyImported).toBe(1)
    expect(wrapper.text()).toContain('1 flight(s) already in your logbook were not shown')
  })

  it('shows Enriched 0/N when AeroDataBox returns no usable hits', async () => {
    apiFetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/flica/status') return { connected: true, username: 'RPA1' }
      if (url === '/api/airline-sync/fetch-flica') {
        return {
          success: true,
          flights: [
            buildPreviewFlight({
              fcv_flight_id: 'FLICA_20260812_4442_LGA',
              date: '2026-08-12',
              flight_number: '4442',
              departure: 'LGA',
              destination: 'RIC',
              aircraft_make_model: 'ERJ-175',
              registration: '',
            }),
          ],
          count: 1,
          enrichAttempted: 2,
          enrichedCount: 0,
          enrichDetail: '0/2 no usable AeroDataBox hit (YX204 AA204 4442-204)',
          warning:
            'Could not enrich flights from AeroDataBox. 0/2 no usable AeroDataBox hit (YX204 AA204 4442-204). Preview shows FLICA schedule times only.',
        }
      }
      if (url === '/api/fcv/check-duplicates') {
        return {
          duplicateFcvFlightIds: [],
          duplicateIndices: [],
          alreadyImportedIndices: [],
          heuristicDuplicateIndices: [],
          alreadyImportedFcvFlightIds: [],
          heuristicMatches: [],
        }
      }
      return {}
    })

    const wrapper = mountFcvSync()
    const setupState = getSetupState(wrapper)
    setupState.connected = true
    await nextTick()

    const fetchFlights = setupState.fetchFlights as () => Promise<void>
    await fetchFlights()
    await nextTick()

    expect(wrapper.text()).toContain('Enriched 0/2')
    expect(wrapper.text()).toContain('YX204')
    expect(wrapper.text()).toContain('AA204')
    expect(wrapper.text()).toContain('4442-204')
  })

  it('shows which AeroDataBox prefix hit on the enrich banner', async () => {
    apiFetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/flica/status') return { connected: true, username: 'RPA1' }
      if (url === '/api/airline-sync/fetch-flica') {
        return {
          success: true,
          flights: [
            buildPreviewFlight({
              fcv_flight_id: 'FLICA_20260812_4442_LGA',
              date: '2026-08-12',
              flight_number: '4442',
              departure: 'LGA',
              destination: 'RIC',
              aircraft_make_model: 'ERJ-175',
              registration: 'N421YX',
            }),
          ],
          count: 1,
          enrichAttempted: 2,
          enrichedCount: 2,
          enrichDetail: '2/2 (AA200 after YX204 RPA204)',
        }
      }
      if (url === '/api/fcv/check-duplicates') {
        return {
          duplicateFcvFlightIds: [],
          duplicateIndices: [],
          alreadyImportedIndices: [],
          heuristicDuplicateIndices: [],
          alreadyImportedFcvFlightIds: [],
          heuristicMatches: [],
        }
      }
      return {}
    })

    const wrapper = mountFcvSync()
    const setupState = getSetupState(wrapper)
    setupState.connected = true
    await nextTick()

    const fetchFlights = setupState.fetchFlights as () => Promise<void>
    await fetchFlights()
    await nextTick()

    expect(wrapper.text()).toContain('Enriched 2/2')
    expect(wrapper.text()).toContain('AA200 after YX204 RPA204')
  })

  it('shows catalog family for a known N-number instead of vendor EMBRAER 175', async () => {
    apiFetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/flica/status') return { connected: true, username: 'RPA1' }
      if (url === '/api/airline-sync/fetch-flica') {
        return {
          success: true,
          flights: [
            buildPreviewFlight({
              fcv_flight_id: 'FLICA_20260812_4442_LGA',
              date: '2026-08-12',
              flight_number: '4442',
              departure: 'LGA',
              destination: 'RIC',
              aircraft_make_model: 'EMBRAER 175',
              registration: 'N421YX',
            }),
          ],
          count: 1,
        }
      }
      if (url === '/api/fcv/check-duplicates') {
        return {
          duplicateFcvFlightIds: [],
          duplicateIndices: [],
          alreadyImportedIndices: [],
          heuristicDuplicateIndices: [],
          alreadyImportedFcvFlightIds: [],
          heuristicMatches: [],
        }
      }
      return {}
    })

    const wrapper = mountFcvSync(['John Smith', 'Amy Beta'], {
      tailCatalogFamilyByTail: { N421YX: 'ERJ170/175' },
    })
    const setupState = getSetupState(wrapper)
    setupState.connected = true
    await nextTick()

    const fetchFlights = setupState.fetchFlights as () => Promise<void>
    await fetchFlights()
    await nextTick()

    const preview = setupState.previewFlights as Array<{
      aircraft_make_model: string
      registration: string
    }>
    expect(preview[0]?.aircraft_make_model).toBe('ERJ170/175')
    expect(wrapper.text()).toContain('ERJ170/175 (N421YX)')
    expect(wrapper.text()).not.toContain('EMBRAER 175')
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

describe('FcvSync unmatched own seat', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
  })

  function unmatchedFlight(overrides: Record<string, unknown> = {}) {
    return buildPreviewFlight({
      role: '',
      flight_time: { total: 1.6, crossCountry: 1.6 },
      training_elements: null,
      training_instructor: null,
      import_metadata: {
        own_role_unmatched: true,
        own_role_unmatched_reason: 'not_on_crew',
        crew_listed: [
          { position: 'CA', name: 'FARMER, DEREK' },
          { position: 'FO', name: 'SUTTON, DREW' },
        ],
      },
      ...overrides,
    })
  }

  it('counts selected unmatched seats and disables import until resolved', async () => {
    const wrapper = mountFcvSync()
    const setupState = getSetupState(wrapper)
    setupState.previewFlights = [unmatchedFlight()]
    setupState.showPreviewModal = true
    setupState.selectedFcvFlightIds = new Set(['fcv-1'])
    await nextTick()

    const isUnmatched = setupState.isFlightOwnRoleUnmatched as (f: {
      role: string
      import_metadata?: unknown
    }) => boolean
    expect(isUnmatched((setupState.previewFlights as Array<{ role: string }>)[0])).toBe(true)
    expect(wrapper.text()).toContain(
      'We could not tell if you were Captain or First Officer on 1 flight(s).'
    )
  })

  it('applying SIC updates role, SIC time, and Captain label', async () => {
    const wrapper = mountFcvSync()
    const setupState = getSetupState(wrapper)
    setupState.previewFlights = [unmatchedFlight()]
    setupState.showPreviewModal = true
    setupState.selectedFcvFlightIds = new Set(['fcv-1'])
    await nextTick()

    const applyAll = setupState.applyOwnSeatToAllUnmatched as (role: 'PIC' | 'SIC') => void
    applyAll('SIC')
    await nextTick()

    const flights = setupState.previewFlights as Array<{
      role: string
      flight_time: Record<string, unknown>
      training_elements: string | null
      training_instructor: string | null
      import_metadata: Record<string, unknown>
    }>
    expect(flights[0]?.role).toBe('SIC')
    expect(flights[0]?.flight_time).toMatchObject({ total: 1.6, sic: 1.6 })
    expect(flights[0]?.flight_time.pic).toBeUndefined()
    expect(flights[0]?.training_elements).toBe('FARMER, DEREK')
    expect(flights[0]?.training_instructor).toBe('Captain')
    expect(flights[0]?.import_metadata.own_role_unmatched).toBeUndefined()
    const isUnmatched = setupState.isFlightOwnRoleUnmatched as (f: {
      role: string
      import_metadata?: unknown
    }) => boolean
    expect(isUnmatched(flights[0])).toBe(false)
  })
})
