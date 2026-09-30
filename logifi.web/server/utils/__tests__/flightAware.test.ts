import { DateTime } from 'luxon'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  extractFlightAwareActuals,
  fetchFlightAwareActuals,
  flightAwareDateQueryWindow,
  formatFlightAwareInstant,
  getFlightAwareEnrichStickyPrefixForTests,
  isFlightAwareConfigured,
  isUsableFlightAwareHit,
  lookupFlightAwareActuals,
  parseIsoToAirportLocal,
  resetFlightAwareClientStateForTests,
  routeFlightAwareQuery,
  setFlightAwareMinIntervalForTests,
  clearFlightAwareRateLimitForTests,
} from '../flightAware'
import {
  aeroDataBoxFlightNumberCandidates,
  flightAwareSearchIdentTiers,
  flightAwareSearchIdents,
} from '../flightEnrichCandidates'

vi.mock('../flightAwareEnv', () => ({
  getFlightAwareEnv: () => ({
    apiKey: 'test-key',
    apiBase: 'https://aeroapi.flightaware.com/aeroapi',
  }),
}))

describe('fetchFlightAwareActuals', () => {
  beforeEach(() => {
    resetFlightAwareClientStateForTests()
    setFlightAwareMinIntervalForTests(0)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    resetFlightAwareClientStateForTests()
  })

  it('returns null on 404 without throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })
    )
    const result = await fetchFlightAwareActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA')
    expect(result).toBeNull()
  })

  it('returns null on network error without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    const result = await fetchFlightAwareActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA')
    expect(result).toBeNull()
  })

  it('extracts tail and all four OOOI times when present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          flights: [
            {
              fa_flight_id: 'AA5770-1722765600-0-0',
              ident: 'AA5770',
              registration: 'N12345',
              aircraft_type: 'E75L',
              origin: { code_iata: 'LGA', code_icao: 'KLGA' },
              destination: { code_iata: 'DCA', code_icao: 'KDCA' },
              actual_out: '2026-08-04T10:08:00Z',
              actual_off: '2026-08-04T10:20:00Z',
              actual_on: '2026-08-04T11:05:00Z',
              actual_in: '2026-08-04T11:15:00Z',
            },
          ],
        }),
      })
    )

    const result = await fetchFlightAwareActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA')
    expect(result).toEqual({
      registration: 'N12345',
      aircraftType: 'E75L',
      actualOutLocal: '2026-08-04 06:08:00',
      actualOffLocal: '2026-08-04 06:20:00',
      actualOnLocal: '2026-08-04 07:05:00',
      actualInLocal: '2026-08-04 07:15:00',
    })
  })

  it('returns null when airports do not match', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          flights: [
            {
              ident: 'AA5770',
              registration: 'N99999',
              origin: { code_iata: 'ORD' },
              destination: { code_iata: 'DFW' },
              actual_out: '2026-08-04T10:00:00Z',
              actual_in: '2026-08-04T12:00:00Z',
            },
          ],
        }),
      })
    )

    const result = await fetchFlightAwareActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA')
    expect(result).toBeNull()
  })

  it('reports auth rejection on 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })
    )
    const result = await lookupFlightAwareActuals('4442', '2026-08-12', 'LGA', 'RIC', 'YX')
    expect(result.actuals).toBeNull()
    expect(result.authRejected).toBe(true)
    expect(result.detail).toMatch(/401/)
  })

  it('reports auth rejection on 403', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      })
    )
    const result = await lookupFlightAwareActuals('4442', '2026-08-12', 'LGA', 'RIC', 'YX')
    expect(result.actuals).toBeNull()
    expect(result.authRejected).toBe(true)
    expect(result.detail).toMatch(/403/)
  })

  it('stops on 429 after one retry on the same candidate', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429 })
    vi.stubGlobal('fetch', fetchMock)

    const resultPromise = lookupFlightAwareActuals('4442', '2026-08-12', 'LGA', 'RIC', 'YX')
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.actuals).toBeNull()
    expect(result.rateLimited).toBe(true)
    expect(result.detail).toBe('HTTP 429')
  })

  it('does not cache HTTP 429 so a later lookup can retry', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          flights: [
            {
              ident: 'AA4442',
              registration: 'N421YX',
              origin: { code_iata: 'LGA' },
              destination: { code_iata: 'RIC' },
              actual_out: '2026-08-12T15:02:00Z',
              actual_off: '2026-08-12T15:14:00Z',
              actual_on: '2026-08-12T16:24:00Z',
              actual_in: '2026-08-12T16:30:00Z',
            },
          ],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const firstPromise = lookupFlightAwareActuals('AA4442', '2026-08-12', 'LGA', 'RIC')
    await vi.runAllTimersAsync()
    const first = await firstPromise
    expect(first.rateLimited).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    clearFlightAwareRateLimitForTests()
    const secondPromise = lookupFlightAwareActuals('AA4442', '2026-08-12', 'LGA', 'RIC')
    await vi.runAllTimersAsync()
    const second = await secondPromise
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(second.rateLimited).toBe(false)
    expect(second.actuals?.registration).toBe('N421YX')
  })

  it('respects Retry-After header on 429 and returns rateLimitResumeMs', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ 'Retry-After': '90' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const resultPromise = lookupFlightAwareActuals('5770', '2026-08-12', 'LGA', 'DCA', 'AA')
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.rateLimited).toBe(true)
    expect(result.rateLimitResumeMs).toBeGreaterThan(Date.now())
    expect(result.rateLimitResumeMs).toBeLessThanOrEqual(Date.now() + 91000)
  })

  it('reuses cached URL JSON without a second fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        flights: [
          {
            ident: 'AA4442',
            registration: 'N421YX',
            origin: { code_iata: 'LGA' },
            destination: { code_iata: 'RIC' },
            actual_out: '2026-08-12T15:02:00Z',
            actual_off: '2026-08-12T15:14:00Z',
            actual_on: '2026-08-12T16:24:00Z',
            actual_in: '2026-08-12T16:30:00Z',
          },
          {
            ident: 'AA4442',
            registration: 'N421YX',
            origin: { code_iata: 'RIC' },
            destination: { code_iata: 'LGA' },
            actual_out: '2026-08-12T17:12:00Z',
            actual_off: '2026-08-12T17:22:00Z',
            actual_on: '2026-08-12T18:18:00Z',
            actual_in: '2026-08-12T18:28:00Z',
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const outbound = await fetchFlightAwareActuals('4442', '2026-08-12', 'LGA', 'RIC', 'AA')
    const inbound = await fetchFlightAwareActuals('4442', '2026-08-12', 'RIC', 'LGA', 'AA')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(outbound?.registration).toBe('N421YX')
    expect(outbound?.actualOutLocal).toContain('2026-08-12')
    expect(inbound?.registration).toBe('N421YX')
    expect(inbound?.actualInLocal).toContain('2026-08-12')
  })

  it('spaces FlightAware fetches at least 1 second apart', async () => {
    setFlightAwareMinIntervalForTests(1000)
    const times: number[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        times.push(Date.now())
        return {
          ok: true,
          status: 200,
          json: async () => ({
            flights: [
              {
                ident: 'AA1001',
                registration: 'N1',
                origin: { code_iata: 'LGA' },
                destination: { code_iata: 'RIC' },
                actual_out: '2026-08-12T14:00:00Z',
                actual_in: '2026-08-12T15:00:00Z',
              },
            ],
          }),
        }
      })
    )

    await fetchFlightAwareActuals('1001', '2026-08-12', 'LGA', 'RIC', 'AA')
    await fetchFlightAwareActuals('1002', '2026-08-12', 'LGA', 'RIC', 'AA')
    expect(times).toHaveLength(2)
    expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(1000)
  }, 4000)

  it('handles empty flights array gracefully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ flights: [] }),
      })
    )

    const result = await fetchFlightAwareActuals('9999', '2026-08-12', 'LGA', 'RIC', 'AA')
    expect(result).toBeNull()
  })

  it('does not cache 200 responses with an empty flights array', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ flights: [] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchFlightAwareActuals('9999', '2026-08-12', 'LGA', 'RIC', 'AA')
    await fetchFlightAwareActuals('9999', '2026-08-12', 'LGA', 'RIC', 'AA')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('queries the departure airport local day with an exclusive end', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        flights: [
          {
            ident: 'AA5770',
            registration: 'N12345',
            origin: { code_iata: 'LGA' },
            destination: { code_iata: 'DCA' },
            actual_out: '2026-08-04T10:08:00Z',
            actual_in: '2026-08-04T11:15:00Z',
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchFlightAwareActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA')
    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('start=2026-08-04T04%3A00%3A00Z')
    expect(url).toContain('end=2026-08-05T04%3A00%3A00Z')
    expect(flightAwareDateQueryWindow('2026-08-04', 'LGA')).toEqual({
      start: '2026-08-04T04:00:00Z',
      end: '2026-08-05T04:00:00Z',
    })
  })

  it('retries once after 429 then succeeds on the same candidate', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          flights: [
            {
              ident: 'AA4442',
              registration: 'N421YX',
              origin: { code_iata: 'LGA' },
              destination: { code_iata: 'RIC' },
              actual_out: '2026-08-12T15:02:00Z',
              actual_in: '2026-08-12T16:30:00Z',
            },
          ],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const resultPromise = lookupFlightAwareActuals('AA4442', '2026-08-12', 'LGA', 'RIC')
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.rateLimited).toBe(false)
    expect(result.actuals?.registration).toBe('N421YX')
  })

  it('keeps sticky RJET prefix across legs after a hit', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          flights: [
            {
              ident: 'RPA4442',
              registration: 'N421YX',
              origin: { code_iata: 'LGA' },
              destination: { code_iata: 'RIC' },
              actual_out: '2026-08-12T15:02:00Z',
              actual_in: '2026-08-12T16:30:00Z',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          flights: [
            {
              ident: 'RPA5501',
              registration: 'N550YX',
              origin: { code_iata: 'RIC' },
              destination: { code_iata: 'LGA' },
              actual_out: '2026-08-12T17:02:00Z',
              actual_in: '2026-08-12T18:30:00Z',
            },
          ],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const first = await lookupFlightAwareActuals('4442', '2026-08-12', 'LGA', 'RIC', 'RJET')
    expect(first.actuals?.registration).toBe('N421YX')
    expect(getFlightAwareEnrichStickyPrefixForTests()).toBe('RPA')

    const second = await lookupFlightAwareActuals('5501', '2026-08-12', 'RIC', 'LGA', 'RJET')
    expect(second.actuals?.registration).toBe('N550YX')
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/flights/RPA5501')
    expect(String(fetchMock.mock.calls[1]?.[0])).not.toContain('YX5501')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('builds RJET FlightAware idents as RPA then YX then AA/UA/DL', () => {
    expect(flightAwareSearchIdents('4442', 'RJET')).toEqual([
      'RPA4442',
      'YX4442',
      'AA4442',
      'UA4442',
      'DL4442',
    ])
    expect(flightAwareSearchIdentTiers('4442', 'RJET')).toEqual([
      ['RPA4442', 'YX4442'],
      ['AA4442', 'UA4442', 'DL4442'],
    ])
    expect(aeroDataBoxFlightNumberCandidates('4442', 'RJET')).toEqual([
      'YX4442',
      'RPA4442',
      'AA4442',
      'UA4442',
      'DL4442',
      '4442',
    ])
  })

  it('does not query tier-2 RJET idents when tier-1 RPA hits', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        flights: [
          {
            ident: 'RPA4442',
            registration: 'N421YX',
            origin: { code_iata: 'LGA' },
            destination: { code_iata: 'RIC' },
            actual_out: '2026-08-12T15:02:00Z',
            actual_in: '2026-08-12T16:30:00Z',
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await lookupFlightAwareActuals('4442', '2026-08-12', 'LGA', 'RIC', 'RJET')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/flights/RPA4442')
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('/flights/AA4442')
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('/flights/YX4442')
  })

  it('queries RPA4442 first for RJET and never uses RJET ident', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        flights: [
          {
            ident: 'RPA4442',
            registration: 'N421YX',
            origin: { code_iata: 'LGA' },
            destination: { code_iata: 'RIC' },
            actual_out: '2026-08-12T15:02:00Z',
            actual_in: '2026-08-12T16:30:00Z',
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupFlightAwareActuals('4442', '2026-08-12', 'LGA', 'RIC', 'RJET')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('/flights/RPA4442')
    expect(url).not.toContain('RJET')
    expect(result.actuals?.registration).toBe('N421YX')
  })

  it('falls through RJET candidates until a usable hit', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          flights: [
            {
              ident: 'AA4442',
              registration: 'N421YX',
              origin: { code_iata: 'LGA' },
              destination: { code_iata: 'RIC' },
              actual_out: '2026-08-12T15:02:00Z',
              actual_in: '2026-08-12T16:30:00Z',
            },
          ],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupFlightAwareActuals('4442', '2026-08-12', 'LGA', 'RIC', 'RJET')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/flights/RPA4442')
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/flights/YX4442')
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain('/flights/AA4442')
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).not.toContain('RJET')
    }
    expect(result.actuals?.registration).toBe('N421YX')
  })

  it('normalizes K-prefix ICAO codes to IATA', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          flights: [
            {
              ident: 'AA5770',
              registration: 'N12345',
              origin: { code_icao: 'KLGA' },
              destination: { code_icao: 'KDCA' },
              actual_out: '2026-08-04T10:08:00Z',
              actual_in: '2026-08-04T11:15:00Z',
            },
          ],
        }),
      })
    )

    const result = await fetchFlightAwareActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA')
    expect(result?.registration).toBe('N12345')
  })

  it('stops the leg on HTTP 400 instead of trying every ident', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400 })
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupFlightAwareActuals('4442', '2026-08-12', 'LGA', 'RIC', 'RJET')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/flights/RPA4442')
    expect(result.actuals).toBeNull()
    expect(result.authRejected).toBe(false)
    expect(result.detail).toBe('FA-RPA4442-400')
  })

  it('uses /flights when the window starts within 9 days', async () => {
    const date = DateTime.utc().minus({ days: 2 }).toFormat('yyyy-MM-dd')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        flights: [
          {
            ident: 'AA100',
            registration: 'N100AA',
            origin: { code_iata: 'LGA' },
            destination: { code_iata: 'DCA' },
            scheduled_out: `${date}T16:00:00Z`,
            actual_out: `${date}T16:05:00Z`,
            actual_in: `${date}T17:10:00Z`,
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchFlightAwareActuals('100', date, 'LGA', 'DCA', 'AA')
    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('/aeroapi/flights/AA100')
    expect(url).not.toContain('/history/')
  })

  it('uses /history/flights when the window starts more than 10 days ago', async () => {
    const date = DateTime.utc().minus({ days: 30 }).toFormat('yyyy-MM-dd')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        flights: [
          {
            ident: 'RPA4752',
            registration: 'N475YX',
            origin: { code_iata: 'LGA' },
            destination: { code_iata: 'ORF' },
            scheduled_out: `${date}T16:00:00Z`,
            actual_out: `${date}T16:05:00Z`,
            actual_in: `${date}T17:40:00Z`,
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchFlightAwareActuals('4752', date, 'LGA', 'ORF', 'RPA')
    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('/history/flights/RPA4752')
    expect(result?.registration).toBe('N475YX')
  })

  it('accepts a late Eastern departure that falls on the next UTC day', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        flights: [
          {
            ident: 'RPA4752',
            registration: 'N475YX',
            aircraft_type: 'E75L',
            origin: { code_iata: 'LGA' },
            destination: { code_iata: 'ORF' },
            scheduled_out: '2026-03-03T03:30:00Z',
            actual_out: '2026-03-03T03:36:00Z',
            actual_in: '2026-03-03T05:10:00Z',
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchFlightAwareActuals('4752', '2026-03-02', 'LGA', 'ORF', 'RPA')
    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('start=2026-03-02T05%3A00%3A00Z')
    expect(url).toContain('end=2026-03-03T05%3A00%3A00Z')
    expect(result?.registration).toBe('N475YX')
    expect(result?.aircraftType).toBe('E75L')
    expect(result?.actualOutLocal).toBe('2026-03-02 22:36:00')
  })

  it('drops a same-route flight whose scheduled local date does not match', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          flights: [
            {
              ident: 'RPA4752',
              registration: 'N999YX',
              origin: { code_iata: 'LGA' },
              destination: { code_iata: 'ORF' },
              scheduled_out: '2026-03-01T15:00:00Z',
              actual_out: '2026-03-01T15:05:00Z',
              actual_in: '2026-03-01T16:40:00Z',
            },
          ],
        }),
      })
    )

    const result = await fetchFlightAwareActuals('4752', '2026-03-02', 'LGA', 'ORF', 'RPA')
    expect(result).toBeNull()
  })
})

describe('parseIsoToAirportLocal', () => {
  it('converts Zulu ISO to departure-airport local wall time (EDT)', () => {
    expect(parseIsoToAirportLocal('2026-09-15T13:54:00Z', 'KLGA')).toBe(
      '2026-09-15 09:54:00'
    )
    expect(parseIsoToAirportLocal('2026-09-15T14:38:00Z', 'KBOS')).toBe(
      '2026-09-15 10:38:00'
    )
  })
})

describe('extractFlightAwareActuals', () => {
  it('extracts all four OOOI times when present', () => {
    const actuals = extractFlightAwareActuals({
      ident: 'AA5770',
      registration: 'N12345',
      aircraft_type: 'E75L',
      origin: { code_iata: 'LGA', code_icao: 'KLGA' },
      destination: { code_iata: 'DCA', code_icao: 'KDCA' },
      actual_out: '2026-08-04T10:08:00Z',
      actual_off: '2026-08-04T10:20:00Z',
      actual_on: '2026-08-04T11:05:00Z',
      actual_in: '2026-08-04T11:15:00Z',
    })
    expect(actuals.registration).toBe('N12345')
    expect(actuals.aircraftType).toBe('E75L')
    expect(actuals.actualOutLocal).toBe('2026-08-04 06:08:00')
    expect(actuals.actualOffLocal).toBe('2026-08-04 06:20:00')
    expect(actuals.actualOnLocal).toBe('2026-08-04 07:05:00')
    expect(actuals.actualInLocal).toBe('2026-08-04 07:15:00')
    expect(isUsableFlightAwareHit(actuals)).toBe(true)
  })

  it('does not copy aircraft_type into registration', () => {
    const actuals = extractFlightAwareActuals({
      ident: 'RPA4752',
      aircraft_type: 'E75L',
      origin: { code_iata: 'LGA' },
      destination: { code_iata: 'ORF' },
      actual_out: '2026-03-03T03:36:00Z',
      actual_in: '2026-03-03T05:10:00Z',
    })
    expect(actuals.registration).toBeNull()
    expect(actuals.aircraftType).toBe('E75L')
    expect(actuals.actualOutLocal).toBe('2026-03-02 22:36:00')
    expect(isUsableFlightAwareHit(actuals)).toBe(true)
  })

  it('returns null for missing actuals', () => {
    const actuals = extractFlightAwareActuals({
      ident: 'AA5770',
      scheduled_out: '2026-08-04T10:00:00Z',
      scheduled_in: '2026-08-04T11:00:00Z',
    })
    expect(actuals.registration).toBeNull()
    expect(actuals.actualOutLocal).toBeNull()
    expect(actuals.actualOffLocal).toBeNull()
    expect(actuals.actualOnLocal).toBeNull()
    expect(actuals.actualInLocal).toBeNull()
    expect(isUsableFlightAwareHit(actuals)).toBe(false)
  })

  it('handles partial OOOI data', () => {
    const actuals = extractFlightAwareActuals({
      ident: 'AA5770',
      registration: 'N12345',
      origin: { code_iata: 'LGA', code_icao: 'KLGA' },
      destination: { code_iata: 'DCA', code_icao: 'KDCA' },
      actual_off: '2026-08-04T10:20:00Z',
      actual_on: '2026-08-04T11:05:00Z',
    })
    expect(actuals.registration).toBe('N12345')
    expect(actuals.actualOutLocal).toBeNull()
    expect(actuals.actualOffLocal).toBe('2026-08-04 06:20:00')
    expect(actuals.actualOnLocal).toBe('2026-08-04 07:05:00')
    expect(actuals.actualInLocal).toBeNull()
    expect(isUsableFlightAwareHit(actuals)).toBe(true)
  })
})

describe('routeFlightAwareQuery', () => {
  const now = DateTime.fromISO('2026-09-30T12:00:00Z', { zone: 'utc' })

  it('uses /flights when start is 9 days old or newer', () => {
    const start = formatFlightAwareInstant(now.minus({ days: 9 }))
    const end = formatFlightAwareInstant(now.minus({ days: 8 }))
    expect(routeFlightAwareQuery(start, end, now)).toEqual({
      resource: 'flights',
      start,
      end,
    })
  })

  it('uses /history/flights when start is more than 10 days old', () => {
    const start = formatFlightAwareInstant(now.minus({ days: 11 }))
    const end = formatFlightAwareInstant(now.minus({ days: 10 }))
    expect(routeFlightAwareQuery(start, end, now).resource).toBe('history/flights')
    expect(routeFlightAwareQuery(start, end, now).end).toBe(end)

    const justPastNine = formatFlightAwareInstant(now.minus({ days: 9, seconds: 1 }))
    expect(
      routeFlightAwareQuery(justPastNine, formatFlightAwareInstant(now.minus({ days: 8 })), now)
        .resource
    ).toBe('history/flights')
    const tenDays = formatFlightAwareInstant(now.minus({ days: 10 }))
    expect(
      routeFlightAwareQuery(tenDays, formatFlightAwareInstant(now.minus({ days: 9 })), now).resource
    ).toBe('history/flights')
  })

  it('caps a history window at 7 days', () => {
    const start = '2026-01-01T00:00:00Z'
    const exactlySeven = routeFlightAwareQuery(start, '2026-01-08T00:00:00Z', now)
    expect(exactlySeven.resource).toBe('history/flights')
    expect(exactlySeven.end).toBe('2026-01-08T00:00:00Z')

    const tooWide = routeFlightAwareQuery(start, '2026-01-20T00:00:00Z', now)
    expect(tooWide.resource).toBe('history/flights')
    expect(tooWide.start).toBe(start)
    expect(tooWide.end).toBe('2026-01-08T00:00:00Z')
  })
})

describe('flightAwareDateQueryWindow', () => {
  it('uses the departure local day when the timezone is known', () => {
    expect(flightAwareDateQueryWindow('2026-03-02', 'LGA')).toEqual({
      start: '2026-03-02T05:00:00Z',
      end: '2026-03-03T05:00:00Z',
    })
    const lateEvening = DateTime.fromISO('2026-03-03T03:30:00Z', { zone: 'utc' })
    const window = flightAwareDateQueryWindow('2026-03-02', 'KLGA')
    expect(lateEvening.toMillis()).toBeGreaterThanOrEqual(DateTime.fromISO(window.start).toMillis())
    expect(lateEvening.toMillis()).toBeLessThan(DateTime.fromISO(window.end).toMillis())
  })

  it('widens the UTC day when the departure timezone is unknown', () => {
    expect(flightAwareDateQueryWindow('2026-03-02')).toEqual({
      start: '2026-03-01T10:00:00Z',
      end: '2026-03-03T14:00:00Z',
    })
    expect(flightAwareDateQueryWindow('2026-03-02', 'ZZZ')).toEqual(
      flightAwareDateQueryWindow('2026-03-02')
    )
  })
})

describe('isFlightAwareConfigured', () => {
  it('returns true when API key is configured', () => {
    expect(isFlightAwareConfigured()).toBe(true)
  })
})
