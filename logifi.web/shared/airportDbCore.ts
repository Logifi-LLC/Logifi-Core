/** Trimmed airport row stored in public/data/airports-client.json */
export interface AirportClientRow {
  iata?: string
  name?: string
  city?: string
  state?: string
  country?: string
  /** Elevation in feet (number only; display adds " ft"). */
  elevationFt?: number
  latitude?: number
  longitude?: number
  timezone?: string | number
}

export interface AirportClientDb {
  version: 1
  rows: Record<string, AirportClientRow>
  iataToIcao: Record<string, string>
}

export function normalizeAirportCodeInput(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}

export function findAirportClientRow(
  db: AirportClientDb,
  normalizedCode: string
): { icao: string; row: AirportClientRow } | undefined {
  if (normalizedCode.length === 4) {
    const row = db.rows[normalizedCode]
    if (row) return { icao: normalizedCode, row }
  }
  if (normalizedCode.length === 3) {
    const icao = db.iataToIcao[normalizedCode]
    if (icao && db.rows[icao]) {
      return { icao, row: db.rows[icao] }
    }
  }
  return undefined
}

export function canonicalizeAirportCodeWithDb(db: AirportClientDb, code: string): string {
  const raw = (code ?? '').trim().toUpperCase()
  if (!raw) return raw

  if (db.rows[raw]) return raw

  const fromIata = db.iataToIcao[raw]
  if (fromIata) return fromIata

  return raw
}
