import type { AirlineLeg } from './airlineLeg'
import * as aeroDataBox from './aeroDataBox'
import * as flightAware from './flightAware'

export interface EnrichmentActuals {
  registration: string | null
  aircraftType: string | null
  actualOutLocal: string | null
  actualInLocal: string | null
  actualOffLocal: string | null
  actualOnLocal: string | null
}

export interface EnrichmentResult {
  actuals: EnrichmentActuals | null
  authRejected: boolean
  rateLimited: boolean
  detail: string | null
  rateLimitResumeMs?: number
}

export type FlightEnrichProvider = 'aerodatabox' | 'flightaware'

export function getFlightEnrichProvider(): FlightEnrichProvider {
  let configValue = ''
  try {
    const config = useRuntimeConfig()
    configValue = String(config.flightEnrichProvider ?? '')
  } catch {
    // useRuntimeConfig not available in tests
  }
  
  const envProvider = (
    process.env.FLIGHT_ENRICH_PROVIDER ??
    process.env.NUXT_FLIGHT_ENRICH_PROVIDER ??
    configValue ??
    ''
  ).trim().toLowerCase()
  
  if (envProvider === 'flightaware') return 'flightaware'
  return 'aerodatabox'
}

export function isEnrichProviderConfigured(provider?: FlightEnrichProvider): boolean {
  const p = provider ?? getFlightEnrichProvider()
  if (p === 'flightaware') return flightAware.isFlightAwareConfigured()
  return aeroDataBox.isAeroDataBoxConfigured()
}

export async function lookupFlightActuals(
  flightNumber: string,
  dateYYYYMMDD: string,
  depIcao: string | undefined,
  arrIcao: string | undefined,
  airlineCode: string,
  provider?: FlightEnrichProvider
): Promise<EnrichmentResult> {
  const p = provider ?? getFlightEnrichProvider()
  
  if (p === 'flightaware') {
    return await flightAware.lookupFlightActuals(
      flightNumber,
      dateYYYYMMDD,
      depIcao,
      arrIcao,
      airlineCode
    )
  }
  
  return await aeroDataBox.lookupFlightActuals(
    flightNumber,
    dateYYYYMMDD,
    depIcao,
    arrIcao,
    airlineCode
  )
}

export function getProviderDisplayName(provider?: FlightEnrichProvider): string {
  const p = provider ?? getFlightEnrichProvider()
  if (p === 'flightaware') return 'FlightAware'
  return 'AeroDataBox'
}
