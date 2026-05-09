import {
  mapAircraftCategoryClass,
  normalizeCrewNameForMatching,
  normalizeFcvAircraftType,
  normalizeRegistrationDisplay,
  normalizeRegistrationKey,
} from './fcvAlignment'

/**
 * FC View GET /flights/ response shape (Flight Crew View Logbook API).
 *
 * Documented / observed fields include routing, block time, tail/type, and local
 * scheduled vs actual OOOI-style timestamps. The API may return additional keys;
 * those are preserved via `[key: string]: unknown` and stored on import in
 * `import_metadata.fcv_raw`.
 */
export interface FcvFlight {
  fcv_flight_id?: string
  flight_number?: string
  trip_number?: string
  role?: string
  pilot_role?: string
  crew_position?: string
  position?: string
  duty_role?: string
  /** 1 when deadhead (observed as integer from API). */
  is_deadhead?: number
  dep_airport?: string
  dep_airport_icao?: string
  arr_airport?: string
  arr_airport_icao?: string
  /** Block as duration HHMM (e.g. "0135"). */
  block?: string
  /** Free-text tail / fleet line from FC View. */
  tail_info?: string
  fcv_tail_number?: string
  fcv_aircraft_type?: string
  aircraft_category?: string
  aircraft_category_class?: string
  scheduled_out_local?: string
  scheduled_in_local?: string
  actual_out_local?: string
  actual_off_local?: string
  actual_on_local?: string
  actual_in_local?: string
  crew?: unknown
  crew_members?: unknown
  crew_list?: unknown
  [key: string]: unknown
}

/** Logifi `oooi` JSONB shape (matches dashboard HHMM digit strings + isZulu). */
export interface FcvMappedOooi {
  out: string | null
  off: string | null
  on: string | null
  in: string | null
  isZulu: boolean
}

/**
 * Preview/import payload: log_entries-compatible object with fcv_flight_id set.
 */
export interface FcvMappedEntry {
  fcv_flight_id: string
  date: string
  role: string
  aircraft_category_class: string
  category_class_time: number | null
  aircraft_make_model: string
  registration: string
  flight_number: string | null
  departure: string
  destination: string
  route: string | null
  training_elements: string | null
  training_instructor: string | null
  flight_time: Record<string, unknown>
  performance: Record<string, unknown>
  oooi: FcvMappedOooi | null
  remarks: string | null
  tags: string[]
  /** Logifi `flight_conditions` values (e.g. `ifr`, `crossCountry`). */
  flight_conditions: string[]
  is_imported: boolean
  import_source: string
  original_entry_date: string | null
  import_metadata: Record<string, unknown> | null
}

/** FCV block is HHMM (e.g. "0135" → 1h 35m). */
export function parseFcvBlockToHours(block: unknown): number | null {
  if (typeof block !== 'string' || !/^\d{3,4}$/.test(block.trim())) return null
  const s = block.trim()
  const padded = s.length === 3 ? `0${s}` : s
  const h = parseInt(padded.slice(0, 2), 10)
  const m = parseInt(padded.slice(2, 4), 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h + m / 60
}

function pickOutLocalDatetimeForGateDuration(f: FcvFlight): string | undefined {
  const a = f.actual_out_local
  const s = f.scheduled_out_local
  if (typeof a === 'string' && a.trim().length >= 10) return a.trim()
  if (typeof s === 'string' && s.trim().length >= 10) return s.trim()
  return undefined
}

function pickInLocalDatetimeForGateDuration(f: FcvFlight): string | undefined {
  const a = f.actual_in_local
  const s = f.scheduled_in_local
  if (typeof a === 'string' && a.trim().length >= 10) return a.trim()
  if (typeof s === 'string' && s.trim().length >= 10) return s.trim()
  return undefined
}

function parseFcvLocalDatetimeToUnixMs(dt: string): number | null {
  const t = dt.trim()
  const normalized = t.includes('T') ? t : t.replace(' ', 'T')
  const ms = Date.parse(normalized)
  return Number.isFinite(ms) ? ms : null
}

/**
 * Gate-to-gate hours from FC View local OUT/IN datetimes (actual preferred, then scheduled),
 * rounded to one decimal to match commercial OOOI duration in the dashboard.
 */
export function gateDurationHoursFromFcvLocalPair(flight: FcvFlight): number | null {
  const outStr = pickOutLocalDatetimeForGateDuration(flight)
  const inStr = pickInLocalDatetimeForGateDuration(flight)
  if (!outStr || !inStr) return null
  const outMs = parseFcvLocalDatetimeToUnixMs(outStr)
  const inMs = parseFcvLocalDatetimeToUnixMs(inStr)
  if (outMs === null || inMs === null) return null
  let diffMin = (inMs - outMs) / 60000
  if (diffMin < 0) diffMin += 24 * 60
  if (diffMin <= 0 || diffMin > 24 * 60) return null
  return Math.round((diffMin / 60) * 10) / 10
}

/**
 * Block hours for flight_time / category_class_time: prefer gate OUT→IN from API datetimes
 * when both ends exist so Total and XC match stored OOOI; otherwise FC View `block` HHMM.
 */
export function resolveFcvBlockHours(flight: FcvFlight): number | null {
  const fromGate = gateDurationHoursFromFcvLocalPair(flight)
  if (fromGate !== null && fromGate > 0 && fromGate <= 24) return fromGate
  return parseFcvBlockToHours(flight.block)
}

/**
 * Parse FC View local datetime strings (e.g. "YYYY-MM-DD HH:MM:SS" or ISO-like)
 * into Logifi OOOI storage: four-digit "HHMM".
 */
export function parseFcvLocalDatetimeToHHMM(dt: unknown): string | null {
  if (typeof dt !== 'string') return null
  const s = dt.trim()
  if (s.length < 10) return null
  const m = s.match(/^\d{4}-\d{2}-\d{2}[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (Number.isNaN(h) || Number.isNaN(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null
  }
  return `${String(h).padStart(2, '0')}${String(min).padStart(2, '0')}`
}

function firstHHMM(actual: unknown, scheduled: unknown): string | null {
  return parseFcvLocalDatetimeToHHMM(actual) ?? parseFcvLocalDatetimeToHHMM(scheduled)
}

function buildOooiFromFlight(f: FcvFlight): FcvMappedOooi | null {
  const out = firstHHMM(f.actual_out_local, f.scheduled_out_local)
  const off = parseFcvLocalDatetimeToHHMM(f.actual_off_local)
  const on = parseFcvLocalDatetimeToHHMM(f.actual_on_local)
  const inn = firstHHMM(f.actual_in_local, f.scheduled_in_local)
  if (out == null && off == null && on == null && inn == null) return null
  return {
    out: out ?? null,
    off: off ?? null,
    on: on ?? null,
    in: inn ?? null,
    isZulu: false,
  }
}

function cloneFlightForMetadata(flight: FcvFlight): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(flight)) as Record<string, unknown>
  } catch {
    return { _fcv_raw_error: 'serialization_failed' }
  }
}

function buildTags(flight: FcvFlight): string[] {
  const d = flight.is_deadhead
  if (d === 1 || d === true) return ['Deadhead']
  return []
}

/** True when departure and destination are usable and not the same (XC-style leg). */
function airportsQualifyForXc(dep: string, arr: string): boolean {
  const a = dep.trim().toUpperCase()
  const b = arr.trim().toUpperCase()
  if (!a || !b) return false
  if (a === 'UNKNOWN' || b === 'UNKNOWN') return false
  return a !== b
}

/**
 * FC View line flights are treated as IFR. Cross-country time matches block when
 * the leg is between two distinct airports (matches manual “new flight” XC defaults).
 */
function buildFcvFlightConditions(xcHours: number | null): string[] {
  const out: string[] = ['ifr']
  if (xcHours != null && xcHours > 0) {
    out.push('crossCountry')
  }
  return out
}

function buildFlightTimeForFcv(
  blockHours: number | null,
  dep: string,
  arr: string,
  role: 'PIC' | 'SIC'
): Record<string, unknown> {
  if (blockHours == null) return {}
  const xc =
    airportsQualifyForXc(dep, arr) && blockHours > 0 ? blockHours : undefined
  const ft: Record<string, unknown> = {
    total: blockHours,
  }
  if (role === 'SIC') ft.sic = blockHours
  else ft.pic = blockHours
  if (xc != null) {
    ft.crossCountry = xc
  }
  return ft
}

function normalizeFcvRole(raw: unknown): 'PIC' | 'SIC' {
  if (typeof raw !== 'string') return 'PIC'
  const v = raw.trim().toLowerCase()
  if (!v) return 'PIC'
  if (
    v === 'fo' ||
    v === 'sic' ||
    v.includes('first officer') ||
    v.includes('first_officer') ||
    v.includes('second in command')
  ) {
    return 'SIC'
  }
  if (
    v === 'ca' ||
    v === 'capt' ||
    v === 'pic' ||
    v.includes('captain') ||
    v.includes('pilot in command')
  ) {
    return 'PIC'
  }
  return 'PIC'
}

function getOwnFcvRole(flight: FcvFlight): 'PIC' | 'SIC' {
  const roleCandidates: unknown[] = [
    flight.role,
    flight.pilot_role,
    flight.crew_position,
    flight.position,
    flight.duty_role,
  ]
  for (const c of roleCandidates) {
    const normalized = normalizeFcvRole(c)
    if (typeof c === 'string' && c.trim()) return normalized
  }
  return 'PIC'
}

type FcvCrewMember = {
  name?: unknown
  full_name?: unknown
  display_name?: unknown
  role?: unknown
  pilot_role?: unknown
  crew_role?: unknown
  crew_position?: unknown
  position?: unknown
  is_me?: unknown
  self?: unknown
  is_self?: unknown
  is_user?: unknown
}

function toCrewMembers(raw: unknown): FcvCrewMember[] {
  if (Array.isArray(raw)) return raw as FcvCrewMember[]
  if (raw && typeof raw === 'object') {
    const obj = raw as { members?: unknown; crew?: unknown }
    if (Array.isArray(obj.members)) return obj.members as FcvCrewMember[]
    if (Array.isArray(obj.crew)) return obj.crew as FcvCrewMember[]
  }
  return []
}

function crewMemberName(member: FcvCrewMember): string {
  const direct = [member.name, member.full_name, member.display_name]
  for (const v of direct) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  const first = (member as { first_name?: unknown }).first_name
  const last = (member as { last_name?: unknown }).last_name
  const full = [first, last]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim())
    .join(' ')
  return full
}

function crewMemberRole(member: FcvCrewMember): 'PIC' | 'SIC' | null {
  const candidates = [
    member.role,
    member.pilot_role,
    member.crew_role,
    member.crew_position,
    member.position,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return normalizeFcvRole(c)
  }
  return null
}

function isSelfCrewMember(member: FcvCrewMember): boolean {
  const flags = [member.is_me, member.self, member.is_self, member.is_user]
  return flags.some((v) => v === true || v === 1 || v === '1')
}

function extractOtherCrew(
  flight: FcvFlight,
  ownRole: 'PIC' | 'SIC'
): { name: string; label: 'Captain' | 'First Officer'; rawName: string } | null {
  const label: 'Captain' | 'First Officer' =
    ownRole === 'PIC' ? 'First Officer' : 'Captain'
  const oppositeRole: 'PIC' | 'SIC' = ownRole === 'PIC' ? 'SIC' : 'PIC'
  const members = [
    ...toCrewMembers(flight.crew),
    ...toCrewMembers(flight.crew_members),
    ...toCrewMembers(flight.crew_list),
  ]
  if (!members.length) return null

  const candidates = members
    .filter((m) => !isSelfCrewMember(m))
    .map((m) => ({
      name: crewMemberName(m),
      role: crewMemberRole(m),
    }))
    .filter((m) => m.name.length > 0)

  if (!candidates.length) return null
  const matched = candidates.find((c) => c.role === oppositeRole) ?? candidates[0]
  return { name: matched.name, label, rawName: matched.name }
}

function primaryDepartureLocal(f: FcvFlight): string | undefined {
  const candidates = [f.actual_off_local, f.actual_out_local, f.scheduled_out_local]
  for (const c of candidates) {
    if (typeof c === 'string' && c.length >= 10) return c
  }
  return undefined
}

/** First 10 chars YYYY-MM-DD from FCV local datetime string (no UTC shift). */
function localCalendarDateFromFcv(dt: string | undefined): string {
  if (!dt || dt.length < 10) return ''
  const ymd = dt.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : ''
}

/**
 * Map one FC View flight to our log_entries preview/insert shape.
 */
export function mapFcvFlightToEntry(flight: FcvFlight): FcvMappedEntry {
  const fcvId = String(flight.fcv_flight_id ?? '').trim()
  const depLocal = primaryDepartureLocal(flight)
  const date = localCalendarDateFromFcv(depLocal)
  const blockHours = resolveFcvBlockHours(flight)

  const registration = normalizeRegistrationDisplay(flight.fcv_tail_number)
  const aircraftType = normalizeFcvAircraftType(flight.fcv_aircraft_type)
  const sourceCategory = String(
    flight.aircraft_category_class ?? flight.aircraft_category ?? 'AIRPLANE'
  ).trim()
  const dep = String(flight.dep_airport_icao ?? flight.dep_airport ?? '').trim()
  const arr = String(flight.arr_airport_icao ?? flight.arr_airport ?? '').trim()
  const fn =
    flight.flight_number != null && String(flight.flight_number).trim() !== ''
      ? String(flight.flight_number).trim()
      : null

  let originalEntryDate: string | null = null
  if (depLocal) {
    const asIso = depLocal.includes('T') ? depLocal : depLocal.replace(' ', 'T')
    const d = new Date(asIso)
    originalEntryDate = Number.isNaN(d.getTime()) ? null : d.toISOString()
  }

  const oooi = buildOooiFromFlight(flight)
  const tags = buildTags(flight)
  const ownRole = getOwnFcvRole(flight)
  const otherCrew = extractOtherCrew(flight, ownRole)
  const flight_time = buildFlightTimeForFcv(blockHours, dep, arr, ownRole)
  const xcRaw = flight_time.crossCountry
  const xcHours =
    typeof xcRaw === 'number' && Number.isFinite(xcRaw) && xcRaw > 0 ? xcRaw : null
  const flight_conditions = buildFcvFlightConditions(xcHours)

  return {
    fcv_flight_id: fcvId,
    date: date || '',
    role: ownRole,
    aircraft_category_class: mapAircraftCategoryClass(sourceCategory),
    category_class_time: blockHours,
    aircraft_make_model: aircraftType || 'Unknown',
    registration,
    flight_number: fn,
    departure: dep,
    destination: arr,
    route: null,
    training_elements: otherCrew?.name ?? null,
    training_instructor: otherCrew?.label ?? null,
    flight_time,
    performance: {},
    oooi,
    remarks: null,
    tags,
    flight_conditions,
    is_imported: true,
    import_source: 'fc_view',
    original_entry_date: originalEntryDate,
    import_metadata: {
      source: 'fc_view',
      fcv_id: fcvId,
      is_deadhead: flight.is_deadhead,
      trip_number: flight.trip_number,
      normalized: {
        registration_key: normalizeRegistrationKey(registration),
        aircraft_type: aircraftType || null,
        aircraft_category_class: mapAircraftCategoryClass(sourceCategory),
        crew_name_raw: otherCrew?.rawName ?? null,
        crew_name_normalized: normalizeCrewNameForMatching(otherCrew?.name ?? ''),
      },
      fcv_raw: cloneFlightForMetadata(flight),
    },
  }
}
