import { canonicalizeAirportCodeWithDb } from '../../shared/airportDbCore'
import { getServerAirportClientDb } from './airportStaticDb'

export function canonicalizeAirportCodeForMatchServer(code: string): string {
  return canonicalizeAirportCodeWithDb(getServerAirportClientDb(), code)
}

export function toCatalogAirportCodeServer(code: string): string {
  return canonicalizeAirportCodeForMatchServer(code)
}
