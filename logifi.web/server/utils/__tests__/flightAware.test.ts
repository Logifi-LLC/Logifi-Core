import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  extractFlightAwareActuals,
  fetchFlightActuals,
  isFlightAwareConfigured,
  isUsableFlightAwareHit,
  lookupFlightActuals,
  resetFlightAwareClientStateForTests,
  setFlightAwareMinIntervalForTests,
  clearFlightAwareRateLimitForTests,
} from '../flightAware'

vi.mock('../flightAwareEnv', () => ({
  getFlightAwareEnv: () => ({
    apiKey: 'test-key',
    apiBase: 'https://aeroapi.flightaware.com/aeroapi',
  }),
}))

describe('fetchFlightActuals', () => {
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
    const result = await fetchFlightActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA')
    expect(result).toBeNull()
  })

  it('returns null on network error without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    const result = await fetchFlightActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA')
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

    const result = await fetchFlightActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA')
    expect(result).toEqual({
      registration: 'N12345',
      aircraftType: 'E75L',
      actualOutLocal: expect.stringContaining('2026-08-04'),
      actualOffLocal: expect.stringContaining('2026-08-04'),
      actualOnLocal: expect.stringContaining('2026-08-04'),
      actualInLocal: expect.stringContaining('2026-08-04'),
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

    const result = await fetchFlightActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA')
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
    const result = await lookupFlightActuals('4442', '2026-08-12', 'LGA', 'RIC', 'YX')
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
    const result = await lookupFlightActuals('4442', '2026-08-12', 'LGA', 'RIC', 'YX')
    expect(result.actuals).toBeNull()
    expect(result.authRejected).toBe(true)
    expect(result.detail).toMatch(/403/)
  })

  it('stops on 429 and returns rate limit info', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429 })
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupFlightActuals('4442', '2026-08-12', 'LGA', 'RIC', 'YX')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.actuals).toBeNull()
    expect(result.rateLimited).toBe(true)
    expect(result.detail).toBe('HTTP 429')
  })

  it('does not cache HTTP 429 so a later lookup can retry', async () => {
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
              actual_off: '2026-08-12T15:14:00Z',
              actual_on: '2026-08-12T16:24:00Z',
              actual_in: '2026-08-12T16:30:00Z',
            },
          ],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const first = await lookupFlightActuals('AA4442', '2026-08-12', 'LGA', 'RIC')
    expect(first.rateLimited).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    clearFlightAwareRateLimitForTests()
    const second = await lookupFlightActuals('AA4442', '2026-08-12', 'LGA', 'RIC')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(second.rateLimited).toBe(false)
    expect(second.actuals?.registration).toBe('N421YX')
  })

  it('respects Retry-After header on 429 and returns rateLimitResumeMs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ 'Retry-After': '90' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupFlightActuals('5770', '2026-08-12', 'LGA', 'DCA', 'AA')
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

    const outbound = await fetchFlightActuals('4442', '2026-08-12', 'LGA', 'RIC', 'AA')
    const inbound = await fetchFlightActuals('4442', '2026-08-12', 'RIC', 'LGA', 'AA')
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

    await fetchFlightActuals('1001', '2026-08-12', 'LGA', 'RIC', 'AA')
    await fetchFlightActuals('1002', '2026-08-12', 'LGA', 'RIC', 'AA')
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

    const result = await fetchFlightActuals('9999', '2026-08-12', 'LGA', 'RIC', 'AA')
    expect(result).toBeNull()
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

    const result = await fetchFlightActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA')
    expect(result?.registration).toBe('N12345')
  })
})

describe('extractFlightAwareActuals', () => {
  it('extracts all four OOOI times when present', () => {
    const actuals = extractFlightAwareActuals({
      ident: 'AA5770',
      registration: 'N12345',
      aircraft_type: 'E75L',
      actual_out: '2026-08-04T10:08:00Z',
      actual_off: '2026-08-04T10:20:00Z',
      actual_on: '2026-08-04T11:05:00Z',
      actual_in: '2026-08-04T11:15:00Z',
    })
    expect(actuals.registration).toBe('N12345')
    expect(actuals.aircraftType).toBe('E75L')
    expect(actuals.actualOutLocal).toContain('2026-08-04')
    expect(actuals.actualOffLocal).toContain('2026-08-04')
    expect(actuals.actualOnLocal).toContain('2026-08-04')
    expect(actuals.actualInLocal).toContain('2026-08-04')
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
      actual_off: '2026-08-04T10:20:00Z',
      actual_on: '2026-08-04T11:05:00Z',
    })
    expect(actuals.registration).toBe('N12345')
    expect(actuals.actualOutLocal).toBeNull()
    expect(actuals.actualOffLocal).toContain('2026-08-04')
    expect(actuals.actualOnLocal).toContain('2026-08-04')
    expect(actuals.actualInLocal).toBeNull()
    expect(isUsableFlightAwareHit(actuals)).toBe(true)
  })
})

describe('isFlightAwareConfigured', () => {
  it('returns true when API key is configured', () => {
    expect(isFlightAwareConfigured()).toBe(true)
  })
})
