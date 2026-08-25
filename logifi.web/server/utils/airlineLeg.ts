import { toCatalogAirportCode } from '../../shared/airportCodeCanonical'
import {
  parseAirlineOwnSeat,
  pickOppositeCrew,
  type AirlineOwnSeat,
  type ListedCrewMember,
  type OwnRoleUnmatchedReason,
} from '../../shared/airlineOwnRole'
import type { FcvFlight, FcvMappedEntry, FcvMappedOooi } from './fcvMap'
import {
  parseFcvLocalDatetimeToHHMM,
  resolveFcvBlockHours,
} from './fcvMap'
import {
  mapAircraftCategoryClass,
  normalizeCrewNameForMatching,
  normalizeFcvAircraftType,
  normalizeRegistrationDisplay,
  normalizeRegistrationKey,
} from './fcvAlignment'

export type AirlineImportSource = 'fc_view' | 'flica_aerodatabox'

export interface AirlineLegCrewMember {
  position: string
  name: string
  employeeId?: string
}

export interface AirlineLeg {
  external_flight_id: string
  import_source: AirlineImportSource
  flight_number: string
  trip_number: string | null
  role: string
  dep_airport: string
  arr_airport: string
  scheduled_out_local: string | null
  scheduled_in_local: string | null
  actual_out_local: string | null
  actual_in_local: string | null
  actual_off_local: string | null
  actual_on_local: string | null
  fcv_tail_number: string
  fcv_aircraft_type: string
  crew: AirlineLegCrewMember[]
  is_deadhead: boolean
  block_minutes: number | null
  aircraft_category_class?: string
}

function listedCrewFromLeg(leg: AirlineLeg): ListedCrewMember[] {
  return leg.crew
    .filter((m) => m.name.trim().length > 0)
    .map((m) => ({ position: m.position, name: m.name }))
}

function unmatchedReasonForLeg(
  leg: AirlineLeg,
  ownRole: AirlineOwnSeat | null
): OwnRoleUnmatchedReason | null {
  if (ownRole) return null
  if (leg.import_source === 'fc_view') return 'unknown_role'
  return listedCrewFromLeg(leg).length === 0 ? 'no_crew' : 'not_on_crew'
}

function blockMinutesToHours(minutes: number | null): number | null {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return null
  return Math.round((minutes / 60) * 10) / 10
}

function hhmmToLocalDatetime(dateYmd: string, hhmm: string | null): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd) || !hhmm || !/^\d{4}$/.test(hhmm)) return null
  const h = hhmm.slice(0, 2)
  const m = hhmm.slice(2, 4)
  return `${dateYmd} ${h}:${m}:00`
}

function firstHHMM(actual: string | null, scheduled: string | null): string | null {
  return (
    parseFcvLocalDatetimeToHHMM(actual) ?? parseFcvLocalDatetimeToHHMM(scheduled)
  )
}

function buildOooiFromLeg(leg: AirlineLeg): FcvMappedOooi | null {
  // out/in: FLICA gate times are ground truth — for completed flights FLICA replaces
  // the scheduled times with actuals, so scheduled_out/in already carry the real values.
  // AeroDataBox gate actuals (actual_out_local / actual_in_local) have lower data quality
  // and must not overwrite the FLICA times.
  const out = parseFcvLocalDatetimeToHHMM(leg.scheduled_out_local)
  const inn = parseFcvLocalDatetimeToHHMM(leg.scheduled_in_local)
  // off/on: wheels-off/wheels-on come from AeroDataBox; FLICA does not provide these.
  const off = parseFcvLocalDatetimeToHHMM(leg.actual_off_local)
  const on = parseFcvLocalDatetimeToHHMM(leg.actual_on_local)
  if (out == null && off == null && on == null && inn == null) return null
  return {
    out: out ?? null,
    off: off ?? null,
    on: on ?? null,
    in: inn ?? null,
    isZulu: false,
  }
}

function airportsQualifyForXc(dep: string, arr: string): boolean {
  const a = dep.trim().toUpperCase()
  const b = arr.trim().toUpperCase()
  if (!a || !b || a === 'UNKNOWN' || b === 'UNKNOWN') return false
  return a !== b
}

function buildFlightTimeForLeg(
  blockHours: number | null,
  dep: string,
  arr: string,
  role: AirlineOwnSeat | null
): Record<string, unknown> {
  if (blockHours == null) return {}
  const ft: Record<string, unknown> = { total: blockHours }
  if (role === 'SIC') ft.sic = blockHours
  else if (role === 'PIC') ft.pic = blockHours
  if (airportsQualifyForXc(dep, arr) && blockHours > 0) {
    ft.crossCountry = blockHours
  }
  return ft
}

function buildFlightConditions(xcHours: number | null): string[] {
  const out: string[] = ['ifr']
  if (xcHours != null && xcHours > 0) out.push('crossCountry')
  return out
}

function extractOtherCrewFromLeg(
  leg: AirlineLeg,
  ownRole: AirlineOwnSeat
): { name: string; label: 'Captain' | 'First Officer'; rawName: string } | null {
  const picked = pickOppositeCrew(listedCrewFromLeg(leg), ownRole)
  if (!picked) return null
  return { name: picked.name, label: picked.label, rawName: picked.name }
}

function primaryDepartureLocal(leg: AirlineLeg): string | null {
  const candidates = [
    leg.actual_off_local,
    leg.actual_out_local,
    leg.scheduled_out_local,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.length >= 10) return c
  }
  return null
}

function localCalendarDateFromDatetime(dt: string | null | undefined): string {
  if (!dt || dt.length < 10) return ''
  const ymd = dt.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : ''
}

function legAsFcvFlightShape(leg: AirlineLeg): FcvFlight {
  return {
    fcv_flight_id: leg.external_flight_id,
    flight_number: leg.flight_number,
    trip_number: leg.trip_number ?? undefined,
    role: leg.role,
    is_deadhead: leg.is_deadhead ? 1 : 0,
    dep_airport: leg.dep_airport,
    arr_airport: leg.arr_airport,
    block:
      leg.block_minutes != null
        ? String(Math.floor(leg.block_minutes / 60)).padStart(2, '0') +
          String(leg.block_minutes % 60).padStart(2, '0')
        : undefined,
    fcv_tail_number: leg.fcv_tail_number,
    fcv_aircraft_type: leg.fcv_aircraft_type,
    aircraft_category_class: leg.aircraft_category_class,
    scheduled_out_local: leg.scheduled_out_local ?? undefined,
    scheduled_in_local: leg.scheduled_in_local ?? undefined,
    actual_out_local: leg.actual_out_local ?? undefined,
    actual_off_local: leg.actual_off_local ?? undefined,
    actual_on_local: leg.actual_on_local ?? undefined,
    actual_in_local: leg.actual_in_local ?? undefined,
    crew: leg.crew,
  }
}

/**
 * Wrap a raw FC View flight into the shared schedule DTO (standby adapter).
 */
export function fcvFlightToAirlineLeg(flight: FcvFlight): AirlineLeg {
  const depLocal =
    flight.actual_off_local ??
    flight.actual_out_local ??
    flight.scheduled_out_local ??
    ''
  const date = localCalendarDateFromDatetime(
    typeof depLocal === 'string' ? depLocal : null
  )
  const blockHours = resolveFcvBlockHours(flight)
  const blockMinutes =
    blockHours != null ? Math.round(blockHours * 60) : null

  const crewMembers: AirlineLegCrewMember[] = []
  const rawCrew = [flight.crew, flight.crew_members, flight.crew_list]
  for (const raw of rawCrew) {
    if (!Array.isArray(raw)) continue
    for (const m of raw) {
      if (!m || typeof m !== 'object') continue
      const obj = m as Record<string, unknown>
      const name = String(obj.name ?? obj.full_name ?? obj.display_name ?? '').trim()
      const position = String(
        obj.role ?? obj.pilot_role ?? obj.crew_position ?? obj.position ?? ''
      ).trim()
      if (name) crewMembers.push({ position, name })
    }
  }

  return {
    external_flight_id: String(flight.fcv_flight_id ?? '').trim(),
    import_source: 'fc_view',
    flight_number: String(flight.flight_number ?? '').trim(),
    trip_number:
      flight.trip_number != null && String(flight.trip_number).trim()
        ? String(flight.trip_number).trim()
        : null,
    role: String(
      flight.role ??
        flight.pilot_role ??
        flight.crew_position ??
        flight.position ??
        flight.duty_role ??
        ''
    ).trim(),
    dep_airport: String(flight.dep_airport_icao ?? flight.dep_airport ?? '').trim(),
    arr_airport: String(flight.arr_airport_icao ?? flight.arr_airport ?? '').trim(),
    scheduled_out_local:
      typeof flight.scheduled_out_local === 'string' ? flight.scheduled_out_local : null,
    scheduled_in_local:
      typeof flight.scheduled_in_local === 'string' ? flight.scheduled_in_local : null,
    actual_out_local:
      typeof flight.actual_out_local === 'string' ? flight.actual_out_local : null,
    actual_in_local:
      typeof flight.actual_in_local === 'string' ? flight.actual_in_local : null,
    actual_off_local:
      typeof flight.actual_off_local === 'string' ? flight.actual_off_local : null,
    actual_on_local:
      typeof flight.actual_on_local === 'string' ? flight.actual_on_local : null,
    fcv_tail_number: String(flight.fcv_tail_number ?? '').trim(),
    fcv_aircraft_type: String(flight.fcv_aircraft_type ?? '').trim(),
    crew: crewMembers,
    is_deadhead: flight.is_deadhead === 1 || flight.is_deadhead === true,
    block_minutes: blockMinutes,
    aircraft_category_class: String(
      flight.aircraft_category_class ?? flight.aircraft_category ?? 'AIRPLANE'
    ).trim(),
  }
}

/**
 * Map a schedule leg (Flica/AeroDataBox or FC View adapter) into log_entries preview shape.
 */
export function mapAirlineLegToFcvMappedEntry(leg: AirlineLeg): FcvMappedEntry {
  const fcvId = leg.external_flight_id.trim()
  const depLocal = primaryDepartureLocal(leg)
  const date = localCalendarDateFromDatetime(depLocal)

  const fcvShape = legAsFcvFlightShape(leg)
  const fromFlicaBlock = blockMinutesToHours(leg.block_minutes)
  const fromGate = resolveFcvBlockHours(fcvShape)
  const blockHours =
    leg.import_source === 'flica_aerodatabox'
      ? fromFlicaBlock ?? fromGate
      : fromGate ?? fromFlicaBlock

  const registration = normalizeRegistrationDisplay(leg.fcv_tail_number)
  const aircraftType = normalizeFcvAircraftType(leg.fcv_aircraft_type)
  const sourceCategory = String(leg.aircraft_category_class ?? 'AIRPLANE').trim()
  const dep = toCatalogAirportCode(leg.dep_airport)
  const arr = toCatalogAirportCode(leg.arr_airport)
  const fn = leg.flight_number.trim() || null

  let originalEntryDate: string | null = null
  if (depLocal) {
    const asIso = depLocal.includes('T') ? depLocal : depLocal.replace(' ', 'T')
    const d = new Date(asIso)
    originalEntryDate = Number.isNaN(d.getTime()) ? null : d.toISOString()
  }

  const oooi = buildOooiFromLeg(leg)
  const tags = leg.is_deadhead ? ['Deadhead'] : []
  const ownRole = parseAirlineOwnSeat(leg.role)
  const unmatchedReason = unmatchedReasonForLeg(leg, ownRole)
  const crewListed = listedCrewFromLeg(leg)
  const otherCrew = ownRole ? extractOtherCrewFromLeg(leg, ownRole) : null
  const flight_time = buildFlightTimeForLeg(blockHours, dep, arr, ownRole)
  const xcRaw = flight_time.crossCountry
  const xcHours =
    typeof xcRaw === 'number' && Number.isFinite(xcRaw) && xcRaw > 0 ? xcRaw : null
  const flight_conditions = buildFlightConditions(xcHours)

  const importSource = leg.import_source

  return {
    fcv_flight_id: fcvId,
    date: date || '',
    role: ownRole ?? '',
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
    import_source: importSource,
    original_entry_date: originalEntryDate,
    import_metadata: {
      source: importSource,
      external_flight_id: fcvId,
      is_deadhead: leg.is_deadhead,
      trip_number: leg.trip_number,
      ...(unmatchedReason
        ? { own_role_unmatched: true, own_role_unmatched_reason: unmatchedReason }
        : {}),
      crew_listed: crewListed,
      normalized: {
        registration_key: normalizeRegistrationKey(registration),
        aircraft_type: aircraftType || null,
        aircraft_category_class: mapAircraftCategoryClass(sourceCategory),
        crew_name_raw: otherCrew?.rawName ?? null,
        crew_name_normalized: normalizeCrewNameForMatching(otherCrew?.name ?? ''),
      },
      airline_leg_raw: { ...leg },
    },
  }
}

export { hhmmToLocalDatetime }
