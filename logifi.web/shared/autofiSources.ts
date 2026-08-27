/** Autofi preview: what FLICA had vs what the enricher returned. Not applied as Out/In. */

export type AutofiEnricherId = 'aerodatabox' | 'flightaware'

export interface AutofiFlicaSnapshot {
  out: string | null
  in: string | null
  off: string | null
  on: string | null
  tail: string | null
  type: string | null
  blockMinutes: number | null
}

export interface AutofiEnricherSnapshot {
  id: AutofiEnricherId
  label: string
  configured: boolean
  attempted: boolean
  hit: boolean
  skipped: boolean
  ident: string | null
  tail: string | null
  type: string | null
  off: string | null
  on: string | null
  /** FIDS/gate Out from the enricher — shown, not written as logbook Out. */
  unusedOut: string | null
  /** FIDS/gate In from the enricher — shown, not written as logbook In. */
  unusedIn: string | null
}

export interface AutofiSourceTrace {
  flica: AutofiFlicaSnapshot
  enricher: AutofiEnricherSnapshot
}

const LOCAL_CLOCK_RE = /^\d{4}-\d{2}-\d{2}[ T](\d{1,2}):(\d{2})/

export function clockFromLocalDatetime(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const m = value.trim().match(LOCAL_CLOCK_RE)
  if (!m) return null
  const hour = Number(m[1])
  const minute = Number(m[2])
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) {
    return null
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function snapshotFlicaSource(leg: {
  scheduled_out_local: string | null
  scheduled_in_local: string | null
  actual_off_local: string | null
  actual_on_local: string | null
  fcv_tail_number: string
  fcv_aircraft_type: string
  block_minutes: number | null
}): AutofiFlicaSnapshot {
  const tail = leg.fcv_tail_number.trim()
  const type = leg.fcv_aircraft_type.trim()
  return {
    out: clockFromLocalDatetime(leg.scheduled_out_local),
    in: clockFromLocalDatetime(leg.scheduled_in_local),
    off: clockFromLocalDatetime(leg.actual_off_local),
    on: clockFromLocalDatetime(leg.actual_on_local),
    tail: tail || null,
    type: type || null,
    blockMinutes: leg.block_minutes,
  }
}

export function emptyAeroEnricherSnapshot(
  extras: Partial<AutofiEnricherSnapshot> = {}
): AutofiEnricherSnapshot {
  return {
    id: 'aerodatabox',
    label: 'AeroDataBox',
    configured: false,
    attempted: false,
    hit: false,
    skipped: false,
    ident: null,
    tail: null,
    type: null,
    off: null,
    on: null,
    unusedOut: null,
    unusedIn: null,
    ...extras,
  }
}

export function buildAutofiSourceTrace(
  flica: AutofiFlicaSnapshot,
  enricher: AutofiEnricherSnapshot
): AutofiSourceTrace {
  return { flica, enricher }
}
