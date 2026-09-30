import { DateTime } from 'luxon'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchFlightAwareActuals,
  lookupFlightAwareActuals,
  resetFlightAwareClientStateForTests,
  setFlightAwareMinIntervalForTests,
} from '../flightAware'
import {
  readFlightLookupCache,
  setFlightLookupCacheStoreForTests,
  writeFlightLookupCache,
  type FlightLookupCacheKey,
  type FlightLookupCacheRecord,
  type FlightLookupCacheStore,
} from '../flightLookupCache'

vi.mock('../flightAwareEnv', () => ({
  getFlightAwareEnv: () => ({
    apiKey: 'test-key',
    apiBase: 'https://aeroapi.flightaware.com/aeroapi',
  }),
}))

function memoryStore(): FlightLookupCacheStore & {
  rows: Map<string, FlightLookupCacheRecord>
} {
  const rows = new Map<string, FlightLookupCacheRecord>()
  const keyOf = (key: FlightLookupCacheKey) =>
    `${key.ident}|${key.departureDate}|${key.depAirport}|${key.arrAirport}`
  return {
    rows,
    async read(key) {
      return rows.get(keyOf(key)) ?? null
    },
    async write(record) {
      rows.set(keyOf(record), { ...record })
    },
  }
}

function storedFlight(overrides: Partial<FlightLookupCacheRecord> = {}): FlightLookupCacheRecord {
  return {
    ident: 'AA5770',
    departureDate: '2026-08-04',
    depAirport: 'LGA',
    arrAirport: 'DCA',
    registration: 'N12345',
    aircraftType: 'E75L',
    actualOut: '2026-08-04T10:08:00Z',
    actualOff: '2026-08-04T10:20:00Z',
    actualOn: '2026-08-04T11:05:00Z',
    actualIn: '2026-08-04T11:15:00Z',
    scheduledOut: '2026-08-04T10:00:00Z',
    faFlightId: 'AA5770-1722765600-0-0',
    source: 'flightaware',
    fetchedAt: '2026-08-05T00:00:00.000Z',
    isFinal: true,
    ...overrides,
  }
}

function apiFlight(date: string, ident: string, airports: { dep: string; arr: string }) {
  return {
    fa_flight_id: `${ident}-id`,
    ident,
    registration: 'N475YX',
    aircraft_type: 'E75L',
    origin: { code_iata: airports.dep },
    destination: { code_iata: airports.arr },
    scheduled_out: `${date}T16:00:00Z`,
    actual_out: `${date}T16:05:00Z`,
    actual_off: `${date}T16:15:00Z`,
    actual_on: `${date}T17:30:00Z`,
    actual_in: `${date}T17:40:00Z`,
  }
}

describe('flight lookup cache', () => {
  let store: ReturnType<typeof memoryStore>

  beforeEach(() => {
    resetFlightAwareClientStateForTests()
    setFlightAwareMinIntervalForTests(0)
    store = memoryStore()
    setFlightLookupCacheStoreForTests(store)
  })

  afterEach(() => {
    setFlightLookupCacheStoreForTests(null)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    resetFlightAwareClientStateForTests()
  })

  it('returns a final cache hit without calling AeroAPI', async () => {
    await writeFlightLookupCache(storedFlight())
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupFlightAwareActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.detail).toBe('FA-AA5770-cache')
    expect(result.actuals).toEqual({
      registration: 'N12345',
      aircraftType: 'E75L',
      actualOutLocal: '2026-08-04 06:08:00',
      actualOffLocal: '2026-08-04 06:20:00',
      actualOnLocal: '2026-08-04 07:05:00',
      actualInLocal: '2026-08-04 07:15:00',
    })
  })

  it('treats a block-in as final even when the stored flag is false', async () => {
    store.rows.set('AA5770|2026-08-04|LGA|DCA', storedFlight({ isFinal: false }))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchFlightAwareActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result?.registration).toBe('N12345')
  })

  it('misses, calls AeroAPI, and writes the matched ident back', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        flights: [apiFlight('2026-08-04', 'RPA4752', { dep: 'LGA', arr: 'ORF' })],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchFlightAwareActuals('4752', '2026-08-04', 'LGA', 'ORF', 'RPA')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result?.registration).toBe('N475YX')
    const row = await readFlightLookupCache({
      ident: 'RPA4752',
      departureDate: '2026-08-04',
      depAirport: 'LGA',
      arrAirport: 'ORF',
    })
    expect(row).toMatchObject({
      ident: 'RPA4752',
      registration: 'N475YX',
      aircraftType: 'E75L',
      actualOut: '2026-08-04T16:05:00Z',
      actualIn: '2026-08-04T17:40:00Z',
      scheduledOut: '2026-08-04T16:00:00Z',
      faFlightId: 'RPA4752-id',
      source: 'flightaware',
      isFinal: true,
    })
  })

  it('refetches a non-final row and overwrites it', async () => {
    const date = DateTime.utc().toFormat('yyyy-MM-dd')
    store.rows.set(
      `AA100|${date}|LGA|DCA`,
      storedFlight({
        ident: 'AA100',
        departureDate: date,
        actualIn: null,
        actualOn: null,
        isFinal: false,
        registration: 'NOLD',
      })
    )
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        flights: [apiFlight(date, 'AA100', { dep: 'LGA', arr: 'DCA' })],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchFlightAwareActuals('100', date, 'LGA', 'DCA', 'AA')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result?.registration).toBe('N475YX')
    const row = store.rows.get(`AA100|${date}|LGA|DCA`)
    expect(row?.registration).toBe('N475YX')
    expect(row?.actualIn).toBe(`${date}T17:40:00Z`)
    expect(row?.isFinal).toBe(true)
  })

  it('trusts a row older than two days even without block-in', async () => {
    const date = DateTime.utc().minus({ days: 3 }).toFormat('yyyy-MM-dd')
    store.rows.set(
      `AA100|${date}|LGA|DCA`,
      storedFlight({
        ident: 'AA100',
        departureDate: date,
        actualOut: `${date}T16:05:00Z`,
        actualOff: null,
        actualOn: null,
        actualIn: null,
        isFinal: false,
        registration: 'NOLD',
      })
    )
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchFlightAwareActuals('100', date, 'LGA', 'DCA', 'AA')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result?.registration).toBe('NOLD')
    expect(result?.actualInLocal).toBeNull()
  })

  it('logs a cache failure and still calls AeroAPI', async () => {
    setFlightLookupCacheStoreForTests({
      async read() {
        throw new Error('db down')
      },
      async write() {
        throw new Error('db down')
      },
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        flights: [apiFlight('2026-08-04', 'AA5770', { dep: 'LGA', arr: 'DCA' })],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchFlightAwareActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA')

    expect(result?.registration).toBe('N475YX')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const messages = warn.mock.calls.map((call) => String(call[0]))
    expect(messages.some((message) => message.includes('[flight_lookup_cache] read failed'))).toBe(
      true
    )
    expect(messages.some((message) => message.includes('[flight_lookup_cache] write failed'))).toBe(
      true
    )
  })

  it('writes back a live /flights hit', async () => {
    const date = DateTime.utc().minus({ days: 2 }).toFormat('yyyy-MM-dd')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        flights: [apiFlight(date, 'AA100', { dep: 'LGA', arr: 'DCA' })],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchFlightAwareActuals('100', date, 'LGA', 'DCA', 'AA')

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('/aeroapi/flights/AA100')
    expect(url).not.toContain('/history/')
    expect(store.rows.get(`AA100|${date}|LGA|DCA`)).toMatchObject({
      source: 'flightaware',
      registration: 'N475YX',
    })
  })

  it('writes back a /history/flights hit', async () => {
    const date = DateTime.utc().minus({ days: 30 }).toFormat('yyyy-MM-dd')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        flights: [apiFlight(date, 'RPA4752', { dep: 'LGA', arr: 'ORF' })],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchFlightAwareActuals('4752', date, 'LGA', 'ORF', 'RPA')

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('/history/flights/RPA4752')
    expect(store.rows.get(`RPA4752|${date}|LGA|ORF`)).toMatchObject({
      source: 'flightaware',
      registration: 'N475YX',
      faFlightId: 'RPA4752-id',
    })
  })
})
