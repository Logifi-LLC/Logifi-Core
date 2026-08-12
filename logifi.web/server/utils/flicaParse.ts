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

const TRIP_HEADER_RE = /^L[\dA-Z]+\s*:\s*(\d{1,2})([A-Z]{3})\b/i
const LEG_LINE_RE =
  /^(?:(MO|TU|WE|TH|FR|SA|SU)\s*)?(\d{1,2})\s+(\*\s+)?(\d{3,4})\s+([A-Z]{3})-([A-Z]{3})(\d{4})?(.*)$/i
const CREW_LINE_RE =
  /^CA\s+(\d+)\s+(.+?)(?:\s+FO\s+(\d+)\s+(.+))?$/i
const LAST_UPDATED_YEAR_RE = /Last Updated[\s\S]*?(\d{4})/i
const EQUIP_RE = /Base\/Equip:\s*[A-Z]{3}\/([A-Z0-9]+)/i

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
  const m = line.match(CREW_LINE_RE)
  if (!m) return []
  const crew: AirlineLegCrewMember[] = []
  const caName = m[2]?.trim()
  if (caName) {
    crew.push({ position: 'CA', name: caName, employeeId: m[1] })
  }
  const foName = m[4]?.trim()
  if (foName) {
    crew.push({ position: 'FO', name: foName, employeeId: m[3] })
  }
  return crew
}

function detectOwnRole(
  crew: AirlineLegCrewMember[],
  opts: FlicaParseOptions
): 'PIC' | 'SIC' {
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
  return 'PIC'
}

function normalizeRoleFromPosition(position: string): 'PIC' | 'SIC' {
  const p = position.trim().toUpperCase()
  if (p === 'FO' || p === 'SIC') return 'SIC'
  return 'PIC'
}

function isSkippableActivityLine(line: string): boolean {
  const u = line.toUpperCase()
  if (u.startsWith('GDO')) return true
  if (u.startsWith('PCM')) return true
  if (u.startsWith('ACTIVITY')) return true
  if (u.startsWith('D-END')) return true
  if (u.startsWith('TOTAL:')) return true
  if (u.startsWith('OPERATES:')) return true
  if (u.startsWith('BASE/EQUIP')) return true
  if (u.startsWith('DY ')) return true
  if (u.includes('DEPLARRLBLK')) return true
  if (u.startsWith('BLOCK ')) return true
  if (u.startsWith('CREDIT ')) return true
  if (u.startsWith('YTD ')) return true
  if (u.startsWith('DAYS OFF')) return true
  if (u.startsWith('SCHEDULE OPTIONS')) return true
  if (u.startsWith('HTTP')) return true
  if (u.includes('FLICA.NET')) return true
  if (u.includes('--')) return true
  return false
}

/**
 * Parse Republic FLICA schedule detail text/HTML into AirlineLeg rows.
 */
export function parseFlicaSchedule(
  htmlOrText: string,
  options: FlicaParseOptions = {}
): AirlineLeg[] {
  const text = htmlOrText
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \u00a0]+/g, ' ')
    .trim()

  if (!text) return []

  const selfHints = inferSelfFromHeader(text)
  const opts: FlicaParseOptions = {
    ...options,
    selfEmployeeId: options.selfEmployeeId ?? selfHints.employeeId,
    selfLastName: options.selfLastName ?? selfHints.lastName,
  }

  const year = inferYear(text, options.defaultYear)
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  const legs: AirlineLeg[] = []
  let currentTrip: string | null = null
  let currentMonthAbbr: string | null = null
  let currentCrew: AirlineLegCrewMember[] = []
  let currentEquip: string | null = null
  let pendingCrewHeader = false

  for (const line of lines) {
    if (/^crew:\s*$/i.test(line)) {
      pendingCrewHeader = true
      continue
    }

    if (pendingCrewHeader) {
      currentCrew = parseCrewLine(line)
      pendingCrewHeader = false
      const role = detectOwnRole(currentCrew, opts)
      for (const leg of legs) {
        if (leg.trip_number === currentTrip) {
          leg.crew = [...currentCrew]
          leg.role = role
        }
      }
      continue
    }

    const tripMatch = line.match(TRIP_HEADER_RE)
    if (tripMatch) {
      currentTrip = line.split(':')[0]?.trim() ?? null
      currentMonthAbbr = tripMatch[2].toUpperCase()
      currentCrew = []
      currentEquip = null
      continue
    }

    const equipMatch = line.match(EQUIP_RE)
    if (equipMatch) {
      currentEquip = equipMatch[1].toUpperCase()
      continue
    }

    if (isSkippableActivityLine(line)) continue

    const legMatch = line.match(LEG_LINE_RE)
    if (!legMatch) continue

    const dayNum = parseInt(legMatch[2], 10)
    const monthAbbr = currentMonthAbbr ?? 'JAN'
    const dateYmd = ymdFromDayMonthYear(dayNum, monthAbbr, year)
    if (!dateYmd) continue

    const isDeadhead = Boolean(legMatch[3])
    const flightNumber = legMatch[4]
    const dep = legMatch[5].toUpperCase()
    const arr = legMatch[6].toUpperCase()
    const gluedDep = legMatch[7] ?? null
    const remainder = legMatch[8] ?? ''
    const nums = remainder.match(/\b\d{4}\b/g) ?? []
    const depHhmm = gluedDep ?? nums[0] ?? null
    const arrHhmm = gluedDep ? (nums[0] ?? null) : (nums[1] ?? null)
    const blockHhmm = gluedDep ? (nums[1] ?? null) : (nums[2] ?? null)
    const blockMinutes = parseBlockMinutes(blockHhmm)

    const scheduledOut = hhmmToLocalDatetime(dateYmd, depHhmm)
    const scheduledIn = hhmmToLocalDatetime(dateYmd, arrHhmm)

    const role = detectOwnRole(currentCrew, opts)

    legs.push({
      external_flight_id: buildExternalFlightId(dateYmd, flightNumber, dep),
      import_source: 'flica_aerodatabox',
      flight_number: flightNumber,
      trip_number: currentTrip,
      role,
      dep_airport: dep,
      arr_airport: arr,
      scheduled_out_local: scheduledOut,
      scheduled_in_local: scheduledIn,
      actual_out_local: null,
      actual_in_local: null,
      actual_off_local: null,
      actual_on_local: null,
      fcv_tail_number: '',
      fcv_aircraft_type: currentEquip ?? '',
      crew: [...currentCrew],
      is_deadhead: isDeadhead,
      block_minutes: blockMinutes,
      aircraft_category_class: 'AIRPLANE',
    })
  }

  return legs
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
  const today =
    opts.todayYmd ?? new Date().toISOString().slice(0, 10)
  return legs.filter((leg) => {
    const date = leg.scheduled_out_local?.slice(0, 10) ?? ''
    if (opts.dateFrom && date && date < opts.dateFrom) return false
    if (opts.dateTo && date && date > opts.dateTo) return false
    if (!opts.includeDeadheads && leg.is_deadhead) return false
    if (
      !opts.includeScheduled &&
      date &&
      date > today &&
      !leg.actual_off_local &&
      !leg.actual_out_local
    ) {
      return false
    }
    return true
  })
}
