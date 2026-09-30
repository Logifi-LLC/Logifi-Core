import { DateTime } from 'luxon'
import type { Database } from '../../app/types/database'
import { getSupabaseServiceClient } from './supabaseService'

/** Reuse a row once block-in is stored, or the departure date is at least this many calendar days ago. */
export const FLIGHT_LOOKUP_FINAL_AGE_DAYS = 2

export interface FlightLookupCacheKey {
  ident: string
  departureDate: string
  depAirport: string
  arrAirport: string
}

export interface FlightLookupCacheRecord extends FlightLookupCacheKey {
  registration: string | null
  aircraftType: string | null
  /** UTC instants, same values FlightAware returns. */
  actualOut: string | null
  actualOff: string | null
  actualOn: string | null
  actualIn: string | null
  scheduledOut: string | null
  faFlightId: string | null
  source: 'flightaware'
  fetchedAt: string
  isFinal: boolean
}

export interface FlightLookupCacheStore {
  read(key: FlightLookupCacheKey): Promise<FlightLookupCacheRecord | null>
  write(record: FlightLookupCacheRecord): Promise<void>
}

type CacheRow = Database['public']['Tables']['flight_lookup_cache']['Row']

let storeOverride: FlightLookupCacheStore | null = null

export function setFlightLookupCacheStoreForTests(store: FlightLookupCacheStore | null): void {
  storeOverride = store
}

export function flightLookupIsFinal(
  record: { actualIn: string | null; departureDate: string },
  now: DateTime = DateTime.utc()
): boolean {
  if (record.actualIn && record.actualIn.trim()) return true
  const departure = DateTime.fromISO(record.departureDate, { zone: 'utc' }).startOf('day')
  if (!departure.isValid) return false
  const ageDays = now.toUTC().startOf('day').diff(departure, 'days').days
  return ageDays >= FLIGHT_LOOKUP_FINAL_AGE_DAYS
}

function logCacheFailure(op: 'read' | 'write', err: unknown): void {
  let message = 'unknown error'
  if (err instanceof Error) message = err.message
  else if (err && typeof err === 'object' && 'message' in err) {
    const raw = (err as { message: unknown }).message
    if (typeof raw === 'string' && raw.trim()) message = raw.trim()
  }
  console.warn(`[flight_lookup_cache] ${op} failed: ${message}`)
}

function cleanUpper(value: string): string {
  return value.trim().toUpperCase()
}

function normalizeKey(key: FlightLookupCacheKey): FlightLookupCacheKey | null {
  const ident = cleanUpper(key.ident)
  const departureDate = key.departureDate.trim()
  const depAirport = cleanUpper(key.depAirport)
  const arrAirport = cleanUpper(key.arrAirport)
  if (!ident || !/^\d{4}-\d{2}-\d{2}$/.test(departureDate) || !depAirport || !arrAirport) {
    return null
  }
  return { ident, departureDate, depAirport, arrAirport }
}

function isoOrNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t ? t : null
}

function rowToRecord(row: CacheRow): FlightLookupCacheRecord | null {
  if (row.source !== 'flightaware') return null
  const key = normalizeKey({
    ident: row.ident,
    departureDate: row.departure_date,
    depAirport: row.dep_airport,
    arrAirport: row.arr_airport,
  })
  if (!key) return null
  return {
    ...key,
    registration: isoOrNull(row.registration),
    aircraftType: isoOrNull(row.aircraft_type),
    actualOut: isoOrNull(row.actual_out),
    actualOff: isoOrNull(row.actual_off),
    actualOn: isoOrNull(row.actual_on),
    actualIn: isoOrNull(row.actual_in),
    scheduledOut: isoOrNull(row.scheduled_out),
    faFlightId: isoOrNull(row.fa_flight_id),
    source: 'flightaware',
    fetchedAt: row.fetched_at,
    isFinal: row.is_final,
  }
}

const defaultStore: FlightLookupCacheStore = {
  async read(key) {
    const supabase = getSupabaseServiceClient()
    if (!supabase) return null
    const { data, error } = await supabase
      .from('flight_lookup_cache')
      .select(
        'ident, departure_date, dep_airport, arr_airport, registration, aircraft_type, actual_out, actual_off, actual_on, actual_in, scheduled_out, fa_flight_id, source, fetched_at, is_final'
      )
      .eq('ident', key.ident)
      .eq('departure_date', key.departureDate)
      .eq('dep_airport', key.depAirport)
      .eq('arr_airport', key.arrAirport)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return rowToRecord(data)
  },
  async write(record) {
    const supabase = getSupabaseServiceClient()
    if (!supabase) return
    const { error } = await supabase.from('flight_lookup_cache').upsert(
      {
        ident: record.ident,
        departure_date: record.departureDate,
        dep_airport: record.depAirport,
        arr_airport: record.arrAirport,
        registration: record.registration,
        aircraft_type: record.aircraftType,
        actual_out: record.actualOut,
        actual_off: record.actualOff,
        actual_on: record.actualOn,
        actual_in: record.actualIn,
        scheduled_out: record.scheduledOut,
        fa_flight_id: record.faFlightId,
        source: 'flightaware',
        fetched_at: record.fetchedAt,
        is_final: record.isFinal,
      },
      { onConflict: 'ident,departure_date,dep_airport,arr_airport' }
    )
    if (error) throw error
  },
}

/** Returns the stored row, including a non-final one. Caller decides whether to trust it. */
export async function readFlightLookupCache(
  key: FlightLookupCacheKey
): Promise<FlightLookupCacheRecord | null> {
  const normalized = normalizeKey(key)
  if (!normalized) return null
  try {
    const store = storeOverride ?? defaultStore
    return await store.read(normalized)
  } catch (err) {
    logCacheFailure('read', err)
    return null
  }
}

export async function writeFlightLookupCache(record: FlightLookupCacheRecord): Promise<void> {
  const key = normalizeKey(record)
  if (!key) return
  const stored: FlightLookupCacheRecord = {
    ...record,
    ...key,
    source: 'flightaware',
    isFinal: flightLookupIsFinal(record),
  }
  try {
    const store = storeOverride ?? defaultStore
    await store.write(stored)
  } catch (err) {
    logCacheFailure('write', err)
  }
}
