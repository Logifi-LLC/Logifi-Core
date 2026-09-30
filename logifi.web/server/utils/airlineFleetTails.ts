import type { Database } from '../../app/types/database'
import { getSupabaseServiceClient } from './supabaseService'

/**
 * Fleet number → registration over time.
 * Nothing in the current import path carries a fleet number (FLICA leaves the
 * tail blank; FC View `tail_info` stays inside raw metadata and is not parsed).
 * Call `recordAirlineFleetTailSighting` from the enrich step once a leg has both.
 */

export interface AirlineFleetTail {
  airlineIcao: string
  fleetNumber: string
  registration: string
  aircraftType: string | null
  firstSeenDate: string
  lastSeenDate: string
}

export interface AirlineFleetTailSighting {
  airlineIcao: string
  fleetNumber: string
  registration: string
  aircraftType: string | null
  seenDate: string
}

type FleetRow = Database['public']['Tables']['airline_fleet_tails']['Row']

const YMD = /^\d{4}-\d{2}-\d{2}$/

function cleanUpper(value: string): string {
  return value.trim().toUpperCase()
}

function normalizeSighting(sighting: AirlineFleetTailSighting): AirlineFleetTailSighting | null {
  const airlineIcao = cleanUpper(sighting.airlineIcao)
  const fleetNumber = cleanUpper(sighting.fleetNumber)
  const registration = cleanUpper(sighting.registration)
  const seenDate = sighting.seenDate.trim()
  if (!airlineIcao || !fleetNumber || !registration || !YMD.test(seenDate)) return null
  const aircraftType = sighting.aircraftType?.trim() || null
  return { airlineIcao, fleetNumber, registration, aircraftType, seenDate }
}

function ymdOrder(ymd: string): number | null {
  if (!YMD.test(ymd)) return null
  const [y, m, d] = ymd.split('-').map((part) => Number(part))
  if (!y || !m || !d) return null
  return Date.UTC(y, m - 1, d)
}

function daysBetween(earlier: string, later: string): number | null {
  const a = ymdOrder(earlier)
  const b = ymdOrder(later)
  if (a == null || b == null) return null
  return Math.round((b - a) / 86_400_000)
}

function rangeDistance(row: AirlineFleetTail, onDate: string): number | null {
  if (onDate >= row.firstSeenDate && onDate <= row.lastSeenDate) return 0
  if (onDate < row.firstSeenDate) return daysBetween(onDate, row.firstSeenDate)
  return daysBetween(row.lastSeenDate, onDate)
}

/**
 * Row whose range contains `onDate`. If several do, the latest `firstSeenDate` wins.
 * Otherwise the nearest range. A re-registered fleet number is a separate row.
 */
export function resolveAirlineFleetTail(
  rows: readonly AirlineFleetTail[],
  onDate: string
): AirlineFleetTail | null {
  const date = onDate.trim()
  if (!YMD.test(date)) return null

  let best: AirlineFleetTail | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const row of rows) {
    if (!YMD.test(row.firstSeenDate) || !YMD.test(row.lastSeenDate)) continue
    const distance = rangeDistance(row, date)
    if (distance == null) continue
    if (distance < bestDistance) {
      best = row
      bestDistance = distance
      continue
    }
    if (distance === bestDistance && best && row.firstSeenDate > best.firstSeenDate) {
      best = row
    }
  }

  return best
}

/** Extend the date range for the same registration, or start a new row. */
export function extendAirlineFleetTail(
  existing: AirlineFleetTail | null,
  sighting: AirlineFleetTailSighting
): AirlineFleetTail | null {
  const next = normalizeSighting(sighting)
  if (!next) return null
  const same =
    existing &&
    cleanUpper(existing.airlineIcao) === next.airlineIcao &&
    cleanUpper(existing.fleetNumber) === next.fleetNumber &&
    cleanUpper(existing.registration) === next.registration
      ? existing
      : null
  if (!same) {
    return {
      airlineIcao: next.airlineIcao,
      fleetNumber: next.fleetNumber,
      registration: next.registration,
      aircraftType: next.aircraftType,
      firstSeenDate: next.seenDate,
      lastSeenDate: next.seenDate,
    }
  }
  return {
    airlineIcao: next.airlineIcao,
    fleetNumber: next.fleetNumber,
    registration: next.registration,
    aircraftType: next.aircraftType ?? same.aircraftType,
    firstSeenDate: next.seenDate < same.firstSeenDate ? next.seenDate : same.firstSeenDate,
    lastSeenDate: next.seenDate > same.lastSeenDate ? next.seenDate : same.lastSeenDate,
  }
}

function logFleetFailure(op: 'read' | 'write', err: unknown): void {
  let message = 'unknown error'
  if (err instanceof Error) message = err.message
  else if (err && typeof err === 'object' && 'message' in err) {
    const raw = (err as { message: unknown }).message
    if (typeof raw === 'string' && raw.trim()) message = raw.trim()
  }
  console.warn(`[airline_fleet_tails] ${op} failed: ${message}`)
}

function rowToTail(row: FleetRow): AirlineFleetTail {
  return {
    airlineIcao: row.airline_icao,
    fleetNumber: row.fleet_number,
    registration: row.registration,
    aircraftType: row.aircraft_type,
    firstSeenDate: row.first_seen_date,
    lastSeenDate: row.last_seen_date,
  }
}

/** Upsert one sighting. A different registration inserts a new row. Failures are logged. */
export async function recordAirlineFleetTailSighting(
  sighting: AirlineFleetTailSighting
): Promise<void> {
  const next = normalizeSighting(sighting)
  if (!next) return
  try {
    const supabase = getSupabaseServiceClient()
    if (!supabase) return
    const { data, error } = await supabase
      .from('airline_fleet_tails')
      .select(
        'airline_icao, fleet_number, registration, aircraft_type, first_seen_date, last_seen_date, updated_at'
      )
      .eq('airline_icao', next.airlineIcao)
      .eq('fleet_number', next.fleetNumber)
      .eq('registration', next.registration)
      .maybeSingle()
    if (error) throw error
    const extended = extendAirlineFleetTail(data ? rowToTail(data) : null, next)
    if (!extended) return
    const { error: writeError } = await supabase.from('airline_fleet_tails').upsert(
      {
        airline_icao: extended.airlineIcao,
        fleet_number: extended.fleetNumber,
        registration: extended.registration,
        aircraft_type: extended.aircraftType,
        first_seen_date: extended.firstSeenDate,
        last_seen_date: extended.lastSeenDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'airline_icao,fleet_number,registration' }
    )
    if (writeError) throw writeError
  } catch (err) {
    logFleetFailure('write', err)
  }
}

/** Load every assignment for a fleet number and resolve it for `onDate`. */
export async function lookupAirlineFleetTail(
  airlineIcao: string,
  fleetNumber: string,
  onDate: string
): Promise<AirlineFleetTail | null> {
  const airline = cleanUpper(airlineIcao)
  const fleet = cleanUpper(fleetNumber)
  if (!airline || !fleet || !YMD.test(onDate.trim())) return null
  try {
    const supabase = getSupabaseServiceClient()
    if (!supabase) return null
    const { data, error } = await supabase
      .from('airline_fleet_tails')
      .select(
        'airline_icao, fleet_number, registration, aircraft_type, first_seen_date, last_seen_date, updated_at'
      )
      .eq('airline_icao', airline)
      .eq('fleet_number', fleet)
    if (error) throw error
    return resolveAirlineFleetTail((data ?? []).map(rowToTail), onDate)
  } catch (err) {
    logFleetFailure('read', err)
    return null
  }
}
