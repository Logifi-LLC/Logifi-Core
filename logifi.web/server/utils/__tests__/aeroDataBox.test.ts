import { describe, expect, it, vi, afterEach } from 'vitest'
import { fetchFlightActuals } from '../aeroDataBox'

vi.mock('../aeroDataBoxEnv', () => ({
  getAeroDataBoxEnv: () => ({
    apiKey: 'test-key',
    apiHost: 'aerodatabox.p.rapidapi.com',
  }),
}))

describe('fetchFlightActuals', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
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
      actualOutLocal: '2026-08-04 06:08:00',
      actualInLocal: '2026-08-04 07:15:00',
      actualOffLocal: '2026-08-04 06:20:00',
      actualOnLocal: '2026-08-04 07:05:00',
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
})
