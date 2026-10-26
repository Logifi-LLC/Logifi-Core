import { findAirportClientRow, normalizeAirportCodeInput } from '../../shared/airportDbCore'
import { normalizeTimezoneToIANA } from '../../shared/airportTimezone'
import { getServerAirportClientDb } from './airportStaticDb'

/**
 * Server-side IANA timezone from the static @nwpr/airport-codes bundle (Nitro).
 */
export function getAirportIanaTimezoneServer(code: string | null | undefined): string | null {
  if (!code) return null
  const normalizedCode = normalizeAirportCodeInput(code)
  if (normalizedCode.length < 3 || normalizedCode.length > 4) return null

  const match = findAirportClientRow(getServerAirportClientDb(), normalizedCode)
  if (!match?.row.timezone) return null
  return normalizeTimezoneToIANA(
    typeof match.row.timezone === 'string' ? match.row.timezone : String(match.row.timezone)
  )
}
