import { isFlicaCarrierEnabled, isFlicaCarrierSupported } from '../../shared/flicaCarriers'

/** DB row shape for public FLICA affiliation fields (no secrets). */
export interface FlicaIntegrationAffiliationRow {
  airline_code: string
  portal_host: string
  username: string
  last_ok_at: string | null
  last_error: string | null
}

export interface AirlineAffiliationDto {
  airlineCode: string
  connected: true
  portalHost: string
  username: string
  lastOkAt: string | null
  lastError: string | null
  /** False when the carrier now requires airline SSO (still stored until disconnect). */
  supported: boolean
  /** False when the carrier is not on ENABLED_FLICA_AIRLINE_CODES (still stored until disconnect). */
  enabled: boolean
}

export function mapFlicaIntegrationsToAffiliations(
  rows: FlicaIntegrationAffiliationRow[]
): AirlineAffiliationDto[] {
  return rows.map((row) => ({
    airlineCode: row.airline_code,
    connected: true,
    portalHost: row.portal_host,
    username: row.username,
    lastOkAt: row.last_ok_at,
    lastError: row.last_error,
    supported: isFlicaCarrierSupported(row.airline_code),
    enabled: isFlicaCarrierEnabled(row.airline_code),
  }))
}
