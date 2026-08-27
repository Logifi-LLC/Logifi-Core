import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  aeroDataBoxFlightNumberCandidates,
  extractAeroDataBoxActuals,
  fetchFlightActuals,
  isUsableAeroDataBoxHit,
  lookupFlightActuals,
  resetAeroDataBoxClientStateForTests,
  setAeroDataBoxMinIntervalForTests,
  clearAeroDataBoxRateLimitForTests,
  summarizeAeroLookupDetails,
} from '../aeroDataBox'

vi.mock('../aeroDataBoxEnv', () => ({
  getAeroDataBoxEnv: () => ({
    apiKey: 'test-key',
    apiHost: 'aerodatabox.p.rapidapi.com',
  }),
}))

describe('fetchFlightActuals', () => {
  beforeEach(() => {
    resetAeroDataBoxClientStateForTests()
    setAeroDataBoxMinIntervalForTests(0)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    resetAeroDataBoxClientStateForTests()
  })

  it('returns null on 404 without throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })
    )
    const result = await fetchFlightActuals('5770', '2026-08-04', 'LGA', 'DCA')
    expect(result).toBeNull()
  })

  it('returns null on network error without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    const result = await fetchFlightActuals('5770', '2026-08-04', 'LGA', 'DCA')
    expect(result).toBeNull()
  })

  it('extracts tail and actual times when route matches', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          {
            number: '5770',
            departure: {
              airport: { iata: 'LGA' },
              actualTimeLocal: '2026-08-04 06:08:00',
              actualRunwayLocal: '2026-08-04 06:20:00',
            },
            arrival: {
              airport: { iata: 'DCA' },
              actualTimeLocal: '2026-08-04 07:15:00',
              actualRunwayLocal: '2026-08-04 07:05:00',
            },
            aircraft: { reg: 'N12345', modelCode: 'E75' },
          },
        ],
      })
    )

    const result = await fetchFlightActuals('5770', '2026-08-04', 'LGA', 'DCA')
    expect(result).toEqual({
      registration: 'N12345',
      aircraftType: 'E75',
      actualOutLocal: null,
      actualInLocal: null,
      actualOffLocal: '2026-08-04 06:20:00',
      actualOnLocal: '2026-08-04 07:05:00',
      unusedOutLocal: '2026-08-04 06:08:00',
      unusedInLocal: '2026-08-04 07:15:00',
    })
  })

  it('returns null when airports do not match', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          {
            departure: { airport: { iata: 'ORD' } },
            arrival: { airport: { iata: 'DFW' } },
            aircraft: { reg: 'N99999' },
          },
        ],
      })
    )

    const result = await fetchFlightActuals('5770', '2026-08-04', 'LGA', 'DCA')
    expect(result).toBeNull()
  })

  it('builds RJET candidates as YX then RPA/AA/UA/DL then bare number', () => {
    expect(aeroDataBoxFlightNumberCandidates('4442', 'RJET')).toEqual([
      'YX4442',
      'RPA4442',
      'AA4442',
      'UA4442',
      'DL4442',
      '4442',
    ])
  })

  it('queries YX4442 Both first for RJET and skips fallbacks on usable hit', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          number: 'YX4442',
          departure: {
            airport: { iata: 'LGA' },
            actualTimeLocal: '2026-08-12 10:59:00',
            actualRunwayLocal: '2026-08-12 11:10:00',
          },
          arrival: {
            airport: { iata: 'RIC' },
            actualTimeLocal: '2026-08-12 12:26:00',
            actualRunwayLocal: '2026-08-12 12:20:00',
          },
          aircraft: { reg: 'N123YX', modelCode: 'E75' },
        },
      ],
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupFlightActuals('4442', '2026-08-12', 'LGA', 'RIC', 'RJET')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'https://aerodatabox.p.rapidapi.com/flights/number/YX4442/2026-08-12?dateLocalRole=Both'
    )
    expect(result.actuals?.registration).toBe('N123YX')
    expect(result.detail).toBe('YX200')
  })

  it('skips YX schedule-only 200 and uses AA4442 tail + actuals', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const u = String(url)
      if (u.includes('/YX4442/')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              number: 'YX4442',
              departure: {
                airport: { iata: 'LGA' },
                scheduledTimeLocal: '2026-08-12 10:59:00',
              },
              arrival: {
                airport: { iata: 'RIC' },
                scheduledTimeLocal: '2026-08-12 12:26:00',
              },
              aircraft: { model: 'E175' },
            },
          ],
        }
      }
      if (u.includes('/AA4442/') && u.includes('dateLocalRole=Both')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              number: 'AA4442',
              departure: {
                airport: { iata: 'LGA' },
                actualTimeLocal: '2026-08-12 11:02:00',
                actualRunwayLocal: '2026-08-12 11:14:00',
              },
              arrival: {
                airport: { iata: 'RIC' },
                actualTimeLocal: '2026-08-12 12:30:00',
                actualRunwayLocal: '2026-08-12 12:24:00',
              },
              aircraft: { reg: 'N999AA', modelCode: 'E75' },
            },
          ],
        }
      }
      return { ok: false, status: 204 }
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupFlightActuals('4442', '2026-08-12', 'LGA', 'RIC', 'RJET')
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/YX4442/')
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('dateLocalRole=Both')
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/AA4442/'))).toBe(true)
    expect(result.actuals?.registration).toBe('N999AA')
    expect(result.actuals?.actualOutLocal).toBeNull()
    expect(result.actuals?.actualOffLocal).toBe('2026-08-12 11:14:00')
    expect(result.detail).toBe('YX200s RPA204 AA200')
  })

  it('falls back to AA4442 when YX 204s', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const u = String(url)
      if (u.includes('/AA4442/') && u.includes('dateLocalRole=Both')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              departure: {
                airport: { iata: 'LGA' },
                actualTimeLocal: '2026-08-12 10:59:00',
              },
              arrival: {
                airport: { iata: 'RIC' },
                actualTimeLocal: '2026-08-12 12:26:00',
              },
              aircraft: { reg: 'N999AA' },
            },
          ],
        }
      }
      return { ok: false, status: 204 }
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupFlightActuals('4442', '2026-08-12', 'LGA', 'RIC', 'RJET')
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/YX4442/')
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/AA4442/'))).toBe(true)
    expect(result.actuals?.registration).toBe('N999AA')
    expect(result.detail).toBe('YX204 RPA204 AA200')
  })

  it('retries AA4442 Both 204 then Departure 200 with tail', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const u = String(url)
      if (u.includes('/AA4442/') && u.includes('dateLocalRole=Departure')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              number: 'AA4442',
              departure: {
                airport: { iata: 'LGA' },
                actualTimeLocal: '2026-08-12 11:02:00',
              },
              arrival: {
                airport: { iata: 'RIC' },
                actualTimeLocal: '2026-08-12 12:30:00',
              },
              aircraft: { reg: 'N204AA' },
            },
          ],
        }
      }
      return { ok: true, status: 204 }
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupFlightActuals('AA4442', '2026-08-12', 'LGA', 'RIC')
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('dateLocalRole=Both')
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('dateLocalRole=Departure')
    expect(result.actuals?.registration).toBe('N204AA')
    expect(result.detail).toBe('AA200')
  })

  it('failed lookup detail includes multiple prefix statuses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 204 })
    )
    const result = await lookupFlightActuals('4442', '2026-08-12', 'LGA', 'RIC', 'RJET')
    expect(result.actuals).toBeNull()
    expect(result.detail).toContain('YX204')
    expect(result.detail).toMatch(/AA204/)
    expect(result.detail).toContain('4442-204')
  })

  it('parses a single flight object (not an array)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          number: 'AA4442',
          departure: {
            airport: { iata: 'LGA' },
            actualTimeLocal: '2026-08-12 11:02:00',
          },
          arrival: {
            airport: { iata: 'RIC' },
            actualTimeLocal: '2026-08-12 12:30:00',
          },
          aircraft: { registration: 'N111AA' },
        }),
      })
    )

    const result = await fetchFlightActuals('AA4442', '2026-08-12', 'LGA', 'RIC')
    expect(result?.registration).toBe('N111AA')
  })

  it('reports auth rejection on 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })
    )
    const result = await lookupFlightActuals('4442', '2026-08-12', 'LGA', 'RIC', 'RJET')
    expect(result.actuals).toBeNull()
    expect(result.authRejected).toBe(true)
    expect(result.detail).toMatch(/401/)
  })

  it('spaces AeroDataBox fetches at least 1 second apart', async () => {
    setAeroDataBoxMinIntervalForTests(1000)
    const times: number[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        times.push(Date.now())
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              departure: {
                airport: { iata: 'LGA' },
                actualTimeLocal: '2026-08-12 10:00:00',
              },
              arrival: {
                airport: { iata: 'RIC' },
                actualTimeLocal: '2026-08-12 11:00:00',
              },
              aircraft: { reg: 'N1' },
            },
          ],
        }
      })
    )

    await fetchFlightActuals('AA1001', '2026-08-12', 'LGA', 'RIC')
    await fetchFlightActuals('AA1002', '2026-08-12', 'LGA', 'RIC')
    expect(times).toHaveLength(2)
    expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(1000)
  }, 4000)

  it('stops on 429 without trying further prefixes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429 })
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupFlightActuals('4442', '2026-08-12', 'LGA', 'RIC', 'RJET')
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
        json: async () => [
          {
            departure: {
              airport: { iata: 'LGA' },
              actualTimeLocal: '2026-08-12 11:02:00',
            },
            arrival: {
              airport: { iata: 'RIC' },
              actualTimeLocal: '2026-08-12 12:30:00',
            },
            aircraft: { reg: 'N421YX' },
          },
        ],
      })
    vi.stubGlobal('fetch', fetchMock)

    const first = await lookupFlightActuals('AA4442', '2026-08-12', 'LGA', 'RIC')
    expect(first.rateLimited).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    clearAeroDataBoxRateLimitForTests()
    const second = await lookupFlightActuals('AA4442', '2026-08-12', 'LGA', 'RIC')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(second.rateLimited).toBe(false)
    expect(second.actuals?.registration).toBe('N421YX')
  })

  it('on YX 404 skips remaining YX URL variants and tries the next prefix', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const u = String(url)
      if (u.includes('/YX4442/')) {
        return { ok: false, status: 404 }
      }
      if (u.includes('/RPA4442/')) {
        return { ok: false, status: 404 }
      }
      if (u.includes('/AA4442/') && u.includes('dateLocalRole=Both')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              departure: {
                airport: { iata: 'LGA' },
                actualTimeLocal: '2026-08-12 11:02:00',
              },
              arrival: {
                airport: { iata: 'RIC' },
                actualTimeLocal: '2026-08-12 12:30:00',
              },
              aircraft: { reg: 'N999AA' },
            },
          ],
        }
      }
      return { ok: false, status: 404 }
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupFlightActuals('4442', '2026-08-12', 'LGA', 'RIC', 'RJET')
    const yxCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/YX4442/'))
    expect(yxCalls).toHaveLength(1)
    expect(result.actuals?.registration).toBe('N999AA')
  })

  it('reuses cached URL JSON for the opposite route without a second fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          number: 'AA4442',
          departure: {
            airport: { iata: 'LGA' },
            revisedTime: { local: '2026-08-12 11:02:00' },
            runwayTime: { local: '2026-08-12 11:14:00' },
          },
          arrival: {
            airport: { iata: 'RIC' },
            revisedTime: { local: '2026-08-12 12:30:00' },
            runwayTime: { local: '2026-08-12 12:24:00' },
          },
          aircraft: { reg: 'N421YX' },
        },
        {
          number: 'AA4442',
          departure: {
            airport: { iata: 'RIC' },
            revisedTime: { local: '2026-08-12 13:12:00' },
            runwayTime: { local: '2026-08-12 13:22:00' },
          },
          arrival: {
            airport: { iata: 'LGA' },
            revisedTime: { local: '2026-08-12 14:28:00' },
            runwayTime: { local: '2026-08-12 14:18:00' },
          },
          aircraft: { reg: 'N421YX' },
        },
      ],
    })
    vi.stubGlobal('fetch', fetchMock)

    const outbound = await fetchFlightActuals('AA4442', '2026-08-12', 'LGA', 'RIC')
    const inbound = await fetchFlightActuals('AA4442', '2026-08-12', 'RIC', 'LGA')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(outbound?.registration).toBe('N421YX')
    expect(outbound?.actualOutLocal).toBeNull()
    expect(outbound?.actualOffLocal).toBe('2026-08-12 11:14:00')
    expect(inbound?.actualOutLocal).toBeNull()
    expect(inbound?.actualOnLocal).toBe('2026-08-12 14:18:00')
  })
})

describe('extractAeroDataBoxActuals', () => {
  it('does not copy scheduledTimeLocal into actuals', () => {
    const actuals = extractAeroDataBoxActuals({
      departure: {
        airport: { iata: 'LGA' },
        scheduledTimeLocal: '2026-08-12 10:59:00',
        estimatedTimeLocal: '2026-08-12 11:00:00',
      },
      arrival: {
        airport: { iata: 'RIC' },
        scheduledTimeLocal: '2026-08-12 12:26:00',
      },
      aircraft: { model: 'E175' },
    })
    expect(actuals.registration).toBeNull()
    expect(actuals.actualOutLocal).toBeNull()
    expect(actuals.actualInLocal).toBeNull()
    expect(actuals.actualOffLocal).toBeNull()
    expect(actuals.actualOnLocal).toBeNull()
    expect(isUsableAeroDataBoxHit(actuals)).toBe(false)
  })

  it('ignores revisedTime and keeps only runway Off/On', () => {
    const actuals = extractAeroDataBoxActuals({
      departure: {
        airport: { iata: 'LGA' },
        scheduledTime: { local: '2026-08-12 10:59:00' },
        revisedTime: { local: '2026-08-12 11:02:00' },
        runwayTime: { local: '2026-08-12 11:10:00' },
      },
      arrival: {
        airport: { iata: 'RIC' },
        scheduledTime: { local: '2026-08-12 12:26:00' },
        revisedTime: { local: '2026-08-12 12:26:00' },
        runwayTime: { local: '2026-08-12 12:20:00' },
      },
      aircraft: { reg: 'N421YX' },
    })
    expect(actuals.registration).toBe('N421YX')
    expect(actuals.actualOutLocal).toBeNull()
    expect(actuals.actualOffLocal).toBe('2026-08-12 11:10:00')
    expect(actuals.actualOnLocal).toBe('2026-08-12 12:20:00')
    expect(actuals.actualInLocal).toBeNull()
    expect(actuals.unusedOutLocal).toBe('2026-08-12 11:02:00')
    expect(actuals.unusedInLocal).toBe('2026-08-12 12:26:00')
    expect(isUsableAeroDataBoxHit(actuals)).toBe(true)
  })

  it('does not copy runwayTime onto gate Out/In when they match', () => {
    const actuals = extractAeroDataBoxActuals({
      departure: {
        airport: { iata: 'LGA' },
        scheduledTime: { local: '2026-08-12 10:59:00' },
        revisedTime: { local: '2026-08-12 11:29:00' },
        runwayTime: { local: '2026-08-12 11:29:00' },
      },
      arrival: {
        airport: { iata: 'RIC' },
        scheduledTime: { local: '2026-08-12 12:26:00' },
        revisedTime: { local: '2026-08-12 12:24:00' },
        runwayTime: { local: '2026-08-12 12:24:00' },
      },
      aircraft: { reg: 'N421YX', modelCode: 'E75' },
    })
    expect(actuals.registration).toBe('N421YX')
    expect(actuals.actualOutLocal).toBeNull()
    expect(actuals.actualOffLocal).toBe('2026-08-12 11:29:00')
    expect(actuals.actualOnLocal).toBe('2026-08-12 12:24:00')
    expect(actuals.actualInLocal).toBeNull()
    expect(isUsableAeroDataBoxHit(actuals)).toBe(true)
  })

  it('does not copy nested scheduledTime into actuals', () => {
    const actuals = extractAeroDataBoxActuals({
      departure: {
        airport: { iata: 'LGA' },
        scheduledTime: { local: '2026-08-12 10:59:00' },
      },
      arrival: {
        airport: { iata: 'RIC' },
        scheduledTime: { local: '2026-08-12 12:26:00' },
      },
      aircraft: { model: 'E175' },
    })
    expect(actuals.actualOutLocal).toBeNull()
    expect(actuals.actualInLocal).toBeNull()
    expect(actuals.actualOffLocal).toBeNull()
    expect(actuals.actualOnLocal).toBeNull()
    expect(isUsableAeroDataBoxHit(actuals)).toBe(false)
  })
})

describe('summarizeAeroLookupDetails', () => {
  it('returns a single winner without a miss trail', () => {
    expect(summarizeAeroLookupDetails(['YX200', 'YX200', 'YX200'])).toBe('YX200')
  })

  it('appends a shared miss trail for the same winner', () => {
    expect(
      summarizeAeroLookupDetails([
        'YX204 RPA204 AA200',
        'YX204 RPA204 AA200',
        'YX204 RPA204 AA200',
      ])
    ).toBe('AA200 after YX204 RPA204')
  })

  it('counts mixed winners without a miss trail', () => {
    expect(
      summarizeAeroLookupDetails(['AA200', 'AA200', 'AA200', '4442-200', '4442-200'])
    ).toBe('AA200×3 4442-200×2')
  })

  it('dedupes identical miss trails when nothing hit', () => {
    expect(
      summarizeAeroLookupDetails([
        'YX204 AA204 4442-204',
        'YX204 AA204 4442-204',
      ])
    ).toBe('YX204 AA204 4442-204')
  })

  it('returns null for an empty list', () => {
    expect(summarizeAeroLookupDetails([])).toBeNull()
  })
})
