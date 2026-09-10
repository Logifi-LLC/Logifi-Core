import { describe, expect, it, vi } from 'vitest'
import {
  getFlightEnrichProvider,
  isEnrichProviderConfigured,
  lookupFlightActuals,
  getProviderDisplayName,
} from '../flightEnrichProvider'

vi.mock('h3', () => ({
  useRuntimeConfig: () => ({
    flightEnrichProvider: '',
  }),
}))

vi.mock('../aeroDataBox', () => ({
  isAeroDataBoxConfigured: () => true,
  lookupFlightActuals: vi.fn().mockResolvedValue({
    actuals: {
      registration: 'N-ADB',
      aircraftType: 'E75',
      actualOutLocal: null,
      actualInLocal: null,
      actualOffLocal: '2026-08-04 10:20:00',
      actualOnLocal: '2026-08-04 11:05:00',
    },
    authRejected: false,
    rateLimited: false,
    detail: 'AA200',
  }),
}))

vi.mock('../flightAware', () => ({
  isFlightAwareConfigured: () => true,
  lookupFlightActuals: vi.fn().mockResolvedValue({
    actuals: {
      registration: 'N-FA',
      aircraftType: 'E75L',
      actualOutLocal: '2026-08-04 10:08:00',
      actualOffLocal: '2026-08-04 10:20:00',
      actualOnLocal: '2026-08-04 11:05:00',
      actualInLocal: '2026-08-04 11:15:00',
    },
    authRejected: false,
    rateLimited: false,
    detail: 'FA-AA5770-200',
  }),
}))

describe('flightEnrichProvider', () => {
  it('defaults to aerodatabox provider', () => {
    expect(getFlightEnrichProvider()).toBe('aerodatabox')
  })

  it('routes to AeroDataBox by default', async () => {
    const result = await lookupFlightActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA')
    expect(result.actuals?.registration).toBe('N-ADB')
    expect(result.actuals?.actualOutLocal).toBeNull()
    expect(result.actuals?.actualOffLocal).toBe('2026-08-04 10:20:00')
  })

  it('routes to FlightAware when explicitly requested', async () => {
    const result = await lookupFlightActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA', 'flightaware')
    expect(result.actuals?.registration).toBe('N-FA')
    expect(result.actuals?.actualOutLocal).toBe('2026-08-04 10:08:00')
    expect(result.actuals?.actualOffLocal).toBe('2026-08-04 10:20:00')
  })

  it('reports correct provider display names', () => {
    expect(getProviderDisplayName('aerodatabox')).toBe('AeroDataBox')
    expect(getProviderDisplayName('flightaware')).toBe('FlightAware')
  })

  it('checks configuration for both providers', () => {
    expect(isEnrichProviderConfigured('aerodatabox')).toBe(true)
    expect(isEnrichProviderConfigured('flightaware')).toBe(true)
  })
})
