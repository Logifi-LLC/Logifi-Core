import { beforeEach, describe, expect, it, vi } from 'vitest'
import { lookupAirportLocal } from '../../../shared/airportLookup'

const platform = vi.hoisted(() => ({ native: false }))
const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('~/composables/useCapacitorPlatform', () => ({
  isCapacitorNative: () => platform.native,
}))

vi.stubGlobal('$fetch', fetchMock)

describe('useAirportLookup', () => {
  beforeEach(async () => {
    platform.native = false
    fetchMock.mockReset()
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
    }
    const { __resetAirportLookupMemoryCacheForTests } = await import('../useAirportLookup')
    __resetAirportLookupMemoryCacheForTests()
  })

  it('uses local airport DB before calling the API', async () => {
    const local = lookupAirportLocal('KJFK')
    expect(local).not.toBeNull()

    const { useAirportLookup } = await import('../useAirportLookup')
    const { lookupAirport } = useAirportLookup()
    const info = await lookupAirport('KJFK')

    expect(info?.code).toBe('KJFK')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('skips API on native when local miss', async () => {
    platform.native = true
    const { useAirportLookup } = await import('../useAirportLookup')
    const { lookupAirport } = useAirportLookup()
    const info = await lookupAirport('ZZZZ')
    expect(info).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('falls back to API on web when local miss', async () => {
    fetchMock.mockResolvedValue({
      success: true,
      data: {
        code: 'QZZZ',
        name: 'Supplement Field',
        latitude: 1,
        longitude: 2,
        source: 'US Airport Supplement (OurAirports)',
      },
    })
    const { useAirportLookup } = await import('../useAirportLookup')
    const { lookupAirport } = useAirportLookup()
    const info = await lookupAirport('QZZZ')
    expect(info?.name).toBe('Supplement Field')
    expect(fetchMock).toHaveBeenCalledWith('/api/lookup-airport?code=QZZZ')
  })
})
