import type { AirlineLeg, AirlineLegCrewMember } from './airlineLeg'
import { hhmmToLocalDatetime } from './airlineLeg'

const MONTH_MAP: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
}

/** Republic pairing ids are L + digit + rest (L7G13, L7513). Avoids matching "Location:". */
const TRIP_RE = /(L\d[\dA-Z]*)\s*:\s*(\d{1,2})([A-Z]{3})\b/gi
const EQUIP_RE = /Base\/Equip:\s*[A-Z]{3}\/([A-Z0-9]+)/gi
const CREW_START_RE = /\b(?:CA|FO)\s+\d{5,7}\s+/gi
const CREW_PAIR_RE = /\b(CA|FO)\s+(\d{5,7})\s+(.+?)(?=\s+(?:CA|FO)\s+\d{5,7}\b|$)/gi
/**
 * Refrigerator-list leg. DOW optional; DH may be blank, *, or a 1-letter flag (C).
 * Route may be LGA-RIC, LGA - RIC, or separate cells LGA RIC. Times may glue to the route.
 */
const LEG_RE =
  /\b(?:(MO|TU|WE|TH|FR|SA|SU)\s+)?(\d{1,2})\s+(\*\s+)?(?:[A-Z]\s+)?(\d{3,4})\s+([A-Z]{3})\s*-?\s*([A-Z]{3})(\d{4})?((?:\s+\d{4}){0,4})/gi
const LAST_UPDATED_YEAR_RE = /Last Updated[\s\S]*?(\d{4})/i

export interface FlicaParseOptions {
  /** Default year when schedule text omits it (YYYY). */
  defaultYear?: number
  /** Pilot employee id from schedule header, e.g. 624619 */
  selfEmployeeId?: string
  /** Pilot last name for crew self-detection */
  selfLastName?: string
}

function inferYear(text: string, defaultYear?: number): number {
  const m = text.match(LAST_UPDATED_YEAR_RE)
  if (m) {
    const y = parseInt(m[1], 10)
    if (Number.isFinite(y) && y >= 2000 && y <= 2100) return y
  }
  if (defaultYear && defaultYear >= 2000 && defaultYear <= 2100) return defaultYear
  return new Date().getFullYear()
}

function inferSelfFromHeader(text: string): { employeeId?: string; lastName?: string } {
  const idMatch = text.match(/\((\d{5,7})\)/)
  const nameMatch = text.match(/^([A-Z][A-Z\s'-]+)\s*\(\d+/m)
  const lastName = nameMatch
    ? nameMatch[1].trim().split(/\s+/).pop()?.replace(/,$/, '')
    : undefined
  return {
    employeeId: idMatch?.[1],
    lastName,
  }
}

function ymdFromDayMonthYear(day: number, monAbbr: string, year: number): string | null {
  const month = MONTH_MAP[monAbbr.toUpperCase()]
  if (!month || day < 1 || day > 31) return null
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

function parseBlockMinutes(hhmm: string | null): number | null {
  if (!hhmm || !/^\d{4}$/.test(hhmm)) return null
  const h = parseInt(hhmm.slice(0, 2), 10)
  const m = parseInt(hhmm.slice(2, 4), 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function buildExternalFlightId(dateYmd: string, flightNumber: string, dep: string): string {
  const d = dateYmd.replace(/-/g, '')
  return `FLICA_${d}_${flightNumber}_${dep.toUpperCase()}`
}

function parseCrewLine(line: string): AirlineLegCrewMember[] {
  const crew: AirlineLegCrewMember[] = []
  const seen = new Set<string>()
  for (const m of line.matchAll(CREW_PAIR_RE)) {
    const position = m[1].toUpperCase()
    const employeeId = m[2]
    const name = m[3].trim().replace(/[.,;]+$/, '').trim()
    if (!name) continue
    const key = `${position}:${employeeId}`
    if (seen.has(key)) continue
    seen.add(key)
    crew.push({ position, name, employeeId })
  }
  return crew
}

function detectOwnRole(
  crew: AirlineLegCrewMember[],
  opts: FlicaParseOptions
): 'PIC' | 'SIC' | null {
  const selfId = opts.selfEmployeeId
  const selfLast = opts.selfLastName?.toUpperCase()
  for (const m of crew) {
    if (selfId && m.employeeId === selfId) {
      return normalizeRoleFromPosition(m.position)
    }
    if (selfLast && m.name.toUpperCase().includes(selfLast)) {
      return normalizeRoleFromPosition(m.position)
    }
  }
  return null
}

function normalizeRoleFromPosition(position: string): 'PIC' | 'SIC' {
  const p = position.trim().toUpperCase()
  if (p === 'FO' || p === 'SIC') return 'SIC'
  return 'PIC'
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&nbsp;|&#160;|&#x0*A0;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => {
      const code = parseInt(n, 10)
      return Number.isFinite(code) ? String.fromCharCode(code) : _
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = parseInt(h, 16)
      return Number.isFinite(code) ? String.fromCharCode(code) : _
    })
}

/**
 * Collapse FLICA HTML tables into text. Classic CGI omits </tr></td> and pads with &nbsp;.
 */
export function flicaHtmlToText(htmlOrText: string): string {
  let s = htmlOrText
  if (/<[a-z!?/]/i.test(s)) {
    s = s
      .replace(/<script[\s\S]*?<\/script>/gi, '\n')
      .replace(/<style[\s\S]*?<\/style>/gi, '\n')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\s*br\s*\/?\s*>/gi, '\n')
      .replace(/<\s*\/?\s*(tr|p|div|li|h[1-6]|pre|table|blockquote)\b[^>]*>/gi, '\n')
      .replace(/<\s*\/?\s*(td|th)\b[^>]*>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  }
  return decodeBasicEntities(s)
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[\u00a0\u2007\u202f\ufeff\ufffd]+/g, ' ')
    .replace(/[ ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()
}

export interface FlicaHtmlSummary {
  bytes: number
  tripCount: number
  hasL7G13: boolean
  has4442: boolean
  textChars: number
  sample: string
}

/** Redacted parse diagnostics for fetch/probe warnings (no cookies/HTML dump). */
export function summarizeFlicaHtml(htmlOrText: string): FlicaHtmlSummary {
  const text = flicaHtmlToText(htmlOrText)
  const trips = text.match(/L\d[\dA-Z]*\s*:/gi) ?? []
  let sampleStart = text.search(/L\d[\dA-Z]*\s*:/i)
  if (sampleStart < 0) {
    sampleStart = text.search(/\b(?:MO|TU|WE|TH|FR|SA|SU)\s+\d{1,2}\b/i)
  }
  if (sampleStart < 0) sampleStart = 0
  const sample = text
    .slice(sampleStart, sampleStart + 360)
    .replace(/\s+/g, ' ')
    .trim()
  return {
    bytes: htmlOrText.length,
    tripCount: trips.length,
    hasL7G13: /L7G13/i.test(htmlOrText) || /L7G13/i.test(text),
    has4442: /\b4442\b/.test(htmlOrText) || /\b4442\b/.test(text),
    textChars: text.length,
    sample,
  }
}

type ParseHit =
  | { kind: 'trip'; index: number; id: string; day: number; monthAbbr: string }
  | { kind: 'equip'; index: number; equip: string }
  | { kind: 'crew'; index: number; crew: AirlineLegCrewMember[] }
  | {
      kind: 'leg'
      index: number
      dayNum: number
      isDeadhead: boolean
      flightNumber: string
      dep: string
      arr: string
      gluedDep: string | null
      remainder: string
    }

function collectHits(text: string): ParseHit[] {
  const hits: ParseHit[] = []

  for (const m of text.matchAll(TRIP_RE)) {
    if (m.index == null) continue
    hits.push({
      kind: 'trip',
      index: m.index,
      id: m[1].toUpperCase(),
      day: parseInt(m[2], 10),
      monthAbbr: m[3].toUpperCase(),
    })
  }

  for (const m of text.matchAll(EQUIP_RE)) {
    if (m.index == null) continue
    hits.push({ kind: 'equip', index: m.index, equip: m[1].toUpperCase() })
  }

  const seenCrewLineStarts = new Set<number>()
  for (const m of text.matchAll(CREW_START_RE)) {
    if (m.index == null) continue
    const nl = text.lastIndexOf('\n', m.index)
    const lineStart = nl === -1 ? 0 : nl + 1
    if (seenCrewLineStarts.has(lineStart)) continue
    seenCrewLineStarts.add(lineStart)
    const line = text
      .slice(lineStart)
      .split('\n')[0]
      ?.replace(/\s+L\d[\dA-Z]*\s*:.*/, '')
      ?.trim()
    if (!line) continue
    const crew = parseCrewLine(line)
    if (crew.length) hits.push({ kind: 'crew', index: lineStart, crew })
  }

  for (const m of text.matchAll(LEG_RE)) {
    if (m.index == null) continue
    hits.push({
      kind: 'leg',
      index: m.index,
      dayNum: parseInt(m[2], 10),
      isDeadhead: Boolean(m[3]),
      flightNumber: m[4],
      dep: m[5].toUpperCase(),
      arr: m[6].toUpperCase(),
      gluedDep: m[7] ?? null,
      remainder: m[8] ?? '',
    })
  }

  hits.sort((a, b) => a.index - b.index || a.kind.localeCompare(b.kind))
  return hits
}

/**
 * Parse Republic FLICA schedule detail text/HTML into AirlineLeg rows.
 */
export function parseFlicaSchedule(
  htmlOrText: string,
  options: FlicaParseOptions = {}
): AirlineLeg[] {
  const text = flicaHtmlToText(htmlOrText)

  if (!text) return []

  const selfHints = inferSelfFromHeader(text)
  const opts: FlicaParseOptions = {
    ...options,
    selfEmployeeId: options.selfEmployeeId ?? selfHints.employeeId,
    selfLastName: options.selfLastName ?? selfHints.lastName,
  }

  const year = inferYear(text, options.defaultYear)
  const legs: AirlineLeg[] = []
  let currentTrip: string | null = null
  let currentMonthAbbr: string | null = null
  let currentCrew: AirlineLegCrewMember[] = []
  let currentEquip: string | null = null

  const applyCrewToCurrentTrip = (crew: AirlineLegCrewMember[]) => {
    currentCrew = crew
    const role = detectOwnRole(currentCrew, opts) ?? ''
    for (const leg of legs) {
      if (leg.trip_number === currentTrip) {
        leg.crew = [...currentCrew]
        leg.role = role
      }
    }
  }

  for (const hit of collectHits(text)) {
    if (hit.kind === 'trip') {
      currentTrip = hit.id
      currentMonthAbbr = hit.monthAbbr
      currentCrew = []
      currentEquip = null
      continue
    }
    if (hit.kind === 'equip') {
      currentEquip = hit.equip
      continue
    }
    if (hit.kind === 'crew') {
      applyCrewToCurrentTrip(hit.crew)
      continue
    }

    const monthAbbr = currentMonthAbbr ?? 'JAN'
    const dateYmd = ymdFromDayMonthYear(hit.dayNum, monthAbbr, year)
    if (!dateYmd) continue
    if (hit.dep === hit.arr) continue
    if (hit.dep.length !== 3 || hit.arr.length !== 3) continue

    const nums = hit.remainder.match(/\b\d{4}\b/g) ?? []
    const depHhmm = hit.gluedDep ?? nums[0] ?? null
    const arrHhmm = hit.gluedDep ? (nums[0] ?? null) : (nums[1] ?? null)
    const blockHhmm = hit.gluedDep ? (nums[1] ?? null) : (nums[2] ?? null)
    const blockMinutes = parseBlockMinutes(blockHhmm)
    const scheduledOut = hhmmToLocalDatetime(dateYmd, depHhmm)
    const scheduledIn = hhmmToLocalDatetime(dateYmd, arrHhmm)
    const role = detectOwnRole(currentCrew, opts) ?? ''

    legs.push({
      external_flight_id: buildExternalFlightId(dateYmd, hit.flightNumber, hit.dep),
      import_source: 'flica_aerodatabox',
      flight_number: hit.flightNumber,
      trip_number: currentTrip,
      role,
      dep_airport: hit.dep,
      arr_airport: hit.arr,
      scheduled_out_local: scheduledOut,
      scheduled_in_local: scheduledIn,
      actual_out_local: null,
      actual_in_local: null,
      actual_off_local: null,
      actual_on_local: null,
      fcv_tail_number: '',
      fcv_aircraft_type: currentEquip ?? '',
      crew: [...currentCrew],
      is_deadhead: hit.isDeadhead,
      block_minutes: blockMinutes,
      aircraft_category_class: 'AIRPLANE',
    })
  }

  return legs
}

export interface AirlineLegFilterStats {
  filtered: AirlineLeg[]
  excludedDeadheads: number
  excludedOutsideRange: number
  excludedScheduled: number
}

export function filterAirlineLegsWithStats(
  legs: AirlineLeg[],
  opts: {
    dateFrom?: string
    dateTo?: string
    includeDeadheads?: boolean
    includeScheduled?: boolean
    todayYmd?: string
  } = {}
): AirlineLegFilterStats {
  const today = opts.todayYmd ?? new Date().toISOString().slice(0, 10)
  const filtered: AirlineLeg[] = []
  let excludedDeadheads = 0
  let excludedOutsideRange = 0
  let excludedScheduled = 0

  for (const leg of legs) {
    const date = leg.scheduled_out_local?.slice(0, 10) ?? ''
    if (opts.dateFrom && date && date < opts.dateFrom) {
      excludedOutsideRange++
      continue
    }
    if (opts.dateTo && date && date > opts.dateTo) {
      excludedOutsideRange++
      continue
    }
    if (!opts.includeDeadheads && leg.is_deadhead) {
      excludedDeadheads++
      continue
    }
    if (
      !opts.includeScheduled &&
      date &&
      date > today &&
      !leg.actual_off_local &&
      !leg.actual_out_local
    ) {
      excludedScheduled++
      continue
    }
    filtered.push(leg)
  }

  return {
    filtered,
    excludedDeadheads,
    excludedOutsideRange,
    excludedScheduled,
  }
}

export function filterAirlineLegs(
  legs: AirlineLeg[],
  opts: {
    dateFrom?: string
    dateTo?: string
    includeDeadheads?: boolean
    includeScheduled?: boolean
    todayYmd?: string
  } = {}
): AirlineLeg[] {
  return filterAirlineLegsWithStats(legs, opts).filtered
}
