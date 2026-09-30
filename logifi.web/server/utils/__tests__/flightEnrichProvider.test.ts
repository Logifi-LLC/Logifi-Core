import { afterEach, describe, expect, it, vi } from 'vitest'
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
  lookupAeroDataBoxActuals: vi.fn().mockResolvedValue({
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
  lookupFlightAwareActuals: vi.fn().mockResolvedValue({
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
  afterEach(() => {
    delete process.env.FLIGHT_ENRICH_PROVIDER
    delete process.env.NUXT_FLIGHT_ENRICH_PROVIDER
  })

  it('defaults to flightaware provider', () => {
    expect(getFlightEnrichProvider()).toBe('flightaware')
  })

  it('routes to FlightAware by default', async () => {
    const result = await lookupFlightActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA')
    expect(result.actuals?.registration).toBe('N-FA')
    expect(result.actuals?.actualOutLocal).toBe('2026-08-04 10:08:00')
    expect(result.actuals?.actualOffLocal).toBe('2026-08-04 10:20:00')
  })

  it('keeps aerodatabox when explicitly selected', async () => {
    process.env.FLIGHT_ENRICH_PROVIDER = 'aerodatabox'
    expect(getFlightEnrichProvider()).toBe('aerodatabox')
    const viaEnv = await lookupFlightActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA')
    expect(viaEnv.actuals?.registration).toBe('N-ADB')
    const viaArg = await lookupFlightActuals('5770', '2026-08-04', 'LGA', 'DCA', 'AA', 'aerodatabox')
    expect(viaArg.actuals?.registration).toBe('N-ADB')
    expect(viaArg.actuals?.actualOutLocal).toBeNull()
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
