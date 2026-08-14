import { beforeEach, describe, expect, it, vi } from 'vitest'
import { aircraftLookupApiPath } from '../useAircraftLookup'

const platform = vi.hoisted(() => ({ native: false }))
const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('~/composables/useCapacitorPlatform', () => ({
  isCapacitorNative: () => platform.native,
}))

vi.mock('../../../shared/aircraftLookupLocal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../shared/aircraftLookupLocal')>()
  return {
    ...actual,
    lookupAircraftLocal: vi.fn(),
  }
})

vi.stubGlobal('$fetch', fetchMock)

describe('aircraftLookupApiPath', () => {
  it('omits refreshOwner for category autofill lookups', () => {
    expect(aircraftLookupApiPath('N653PA')).toBe('/api/lookup-aircraft?registration=N653PA')
    expect(aircraftLookupApiPath('N653PA')).not.toContain('refreshOwner')
  })

  it('adds refreshOwner for modal details lookups', () => {
    expect(aircraftLookupApiPath('N653PA', { refreshOwner: true })).toBe(
      '/api/lookup-aircraft?registration=N653PA&refreshOwner=1'
    )
  })
})

describe('useAircraftLookup', () => {
  beforeEach(() => {
    platform.native = false
    fetchMock.mockReset()
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
    }
  })

  it('lookupAircraft does not pass refreshOwner', async () => {
    fetchMock.mockResolvedValue({
      success: true,
      data: { registration: 'N653PA', make: 'CESSNA' },
    })
    const { useAircraftLookup } = await import('../useAircraftLookup')
    const { lookupAircraft } = useAircraftLookup()
    await lookupAircraft('N653PA')
    expect(fetchMock).toHaveBeenCalledWith('/api/lookup-aircraft?registration=N653PA')
  })

  it('lookupAircraftDetails requests a live owner overlay', async () => {
    fetchMock.mockResolvedValue({
      success: true,
      data: { registration: 'N653PA', make: 'CESSNA', owner: 'NEW OWNER LLC' },
    })
    const { useAircraftLookup } = await import('../useAircraftLookup')
    const { lookupAircraftDetails } = useAircraftLookup()
    await lookupAircraftDetails('N653PA')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/lookup-aircraft?registration=N653PA&refreshOwner=1'
    )
  })

  it('lookupAircraftDetails ignores cached FAA engine codes', async () => {
    window.localStorage.setItem(
      'logifi://aircraft-cache-v2',
      JSON.stringify({
        N653PA: {
          registration: 'N653PA',
          engineType: '41597',
          lastUpdated: new Date().toISOString(),
        },
      })
    )
    fetchMock.mockResolvedValue({
      success: true,
      data: {
        registration: 'N653PA',
        engineType: 'Piston',
        engineModel: 'LYCOMING IO-360-L2A',
      },
    })
    const { useAircraftLookup } = await import('../useAircraftLookup')
    const { lookupAircraftDetails } = useAircraftLookup()
    const info = await lookupAircraftDetails('N653PA')
    expect(fetchMock).toHaveBeenCalled()
    expect(info?.engineType).toBe('Piston')
    expect(info?.engineModel).toBe('LYCOMING IO-360-L2A')
  })
})
