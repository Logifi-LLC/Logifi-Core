import { DateTime } from 'luxon'
import { getAirportIanaTimezone } from '../../shared/airportTimezone'
import type { AirlineLeg, AirlineLegCrewMember } from './airlineLeg'
import { hhmmToLocalDatetime } from './airlineLeg'

/** Republic pairings are Eastern-based; used when airport TZ is unknown and for naive `nowIso`. */
export const FLICA_DEFAULT_NOW_ZONE = 'America/New_York'

const FCV_LOCAL_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/

const LAST_UPDATED_FULL_RE =
  /Last Updated\s+([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+([A-Z]{2,4})/i

const TZ_ABBR_TO_IANA: Record<string, string> = {
  EST: 'America/New_York',
  EDT: 'America/New_York',
  CST: 'America/Chicago',
  CDT: 'America/Chicago',
  MST: 'America/Denver',
  MDT: 'America/Denver',
  PST: 'America/Los_Angeles',
  PDT: 'America/Los_Angeles',
}

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
const EQUIP_RE = /Base\/Equip:[\s|]*[A-Z]{3}\/([A-Z0-9]+)((?:[\s|]*(?:CA|FO)\d{2})*)/gi
const CREW_START_RE = /\b(?:CA|FO)[\s|]+\d{5,7}[\s|]+/gi
const CREW_PAIR_RE =
  /\b(CA|FO)[\s|]+(\d{5,7})[\s|]+(.+?)(?=[\s|]+(?:CA|FO)[\s|]+\d{5,7}\b|$)/gi
const LAST_UPDATED_YEAR_RE = /Last Updated[\s\S]*?(\d{4})/i
const DOW_RE = /^(MO|TU|WE|TH|FR|SA|SU)$/i
const FLIGHT_NO_RE = /^\d{3,4}$/
const AIRPORT_RE = /^[A-Z]{3}$/
const DH_MARK_RE = /^(D|DH|\*)$/i
const ROW_SENTINEL = '\u001e'

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

function isValidYmd(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const dt = new Date(Date.UTC(year, month - 1, day))
  return (
    dt.getUTCFullYear() === year && dt.getUTCMonth() === month - 1 && dt.getUTCDate() === day
  )
}

function formatYmd(year: number, month: number, day: number): string | null {
  if (!isValidYmd(year, month, day)) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function ymdFromDayMonthYear(day: number, monAbbr: string, year: number): string | null {
  const month = MONTH_MAP[monAbbr.toUpperCase()]
  if (!month) return null
  return formatYmd(year, month, day)
}

/**
 * Refrigerator day number → calendar date. Pairings are any length (line 1–5,
 * reserve up to 6, IROPS into days off). When the day number goes backward vs
 * the previous leg, the pairing crossed a month (or year).
 */
function ymdForTripLeg(
  dayNum: number,
  monthAbbr: string,
  year: number,
  prevYmd: string | null
): string | null {
  const base = ymdFromDayMonthYear(dayNum, monthAbbr, year)
  if (!prevYmd || (base && base >= prevYmd)) return base

  const py = parseInt(prevYmd.slice(0, 4), 10)
  const pm = parseInt(prevYmd.slice(5, 7), 10)
  let y = py
  let m = pm
  for (let step = 0; step < 4; step++) {
    const candidate = formatYmd(y, m, dayNum)
    if (candidate && candidate >= prevYmd) return candidate
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }
  return base
}

function parseBlockMinutes(hhmm: string | null): number | null {
  if (!hhmm || !/^\d{4}$/.test(hhmm)) return null
  const h = parseInt(hhmm.slice(0, 2), 10)
  const m = parseInt(hhmm.slice(2, 4), 10)
  if (Number.isNaN(h) || Number.isNaN(m) || m > 59) return null
  return h * 60 + m
}

function isValidClockHhmm(hhmm: string): boolean {
  if (!/^\d{4}$/.test(hhmm)) return false
  const h = parseInt(hhmm.slice(0, 2), 10)
  const m = parseInt(hhmm.slice(2, 4), 10)
  return h <= 23 && m <= 59
}

function clockMinutes(hhmm: string): number {
  return parseInt(hhmm.slice(0, 2), 10) * 60 + parseInt(hhmm.slice(2, 4), 10)
}

/**
 * True when out/in look like clock times and block is a duration that matches
 * elapsed time, allowing 0–3h timezone slack (US continental).
 */
export function isPlausibleFlicaGateTriple(out: string, inn: string, block: string): boolean {
  if (!isValidClockHhmm(out) || !isValidClockHhmm(inn)) return false
  const blk = parseBlockMinutes(block)
  if (blk == null || blk < 15 || blk > 12 * 60) return false
  let diff = clockMinutes(inn) - clockMinutes(out)
  if (diff <= 0) diff += 24 * 60
  const slack = Math.abs(diff - blk)
  if (slack <= 20) return true
  const nearestHour = Math.round(slack / 60) * 60
  if (nearestHour < 60 || nearestHour > 3 * 60) return false
  return Math.abs(slack - nearestHour) <= 15
}

function findPlausibleGateTriples(
  nums: string[]
): Array<{ index: number; out: string; inn: string; block: string }> {
  const found: Array<{ index: number; out: string; inn: string; block: string }> = []
  for (let i = 0; i + 2 < nums.length; i++) {
    const out = nums[i]!
    const inn = nums[i + 1]!
    const block = nums[i + 2]!
    if (isPlausibleFlicaGateTriple(out, inn, block)) {
      found.push({ index: i, out, inn, block })
    }
  }
  return found
}

/**
 * Pick DEPL/ARRL/BLKT from a FLICA remainder. When published actuals are
 * appended after the bid triple, prefer a later non-overlapping Out/In/block.
 */
export function pickFlicaGateHhmm(
  nums: string[],
  gluedDep: string | null
): { depHhmm: string | null; arrHhmm: string | null; blockHhmm: string | null } {
  const triples = findPlausibleGateTriples(nums)
  const first = triples[0] ?? null
  const later =
    first != null ? triples.filter((t) => t.index >= first.index + 3).at(-1) ?? null : null
  const chosen = later ?? first

  if (chosen && (!gluedDep || chosen.index > 0 || later)) {
    return { depHhmm: chosen.out, arrHhmm: chosen.inn, blockHhmm: chosen.block }
  }
  if (gluedDep) {
    return {
      depHhmm: gluedDep,
      arrHhmm: nums[0] ?? null,
      blockHhmm: nums[1] ?? null,
    }
  }
  return {
    depHhmm: nums[0] ?? null,
    arrHhmm: nums[1] ?? null,
    blockHhmm: nums[2] ?? null,
  }
}

function parseLocalDatetimeInZone(dt: string, zone: string): DateTime | null {
  const m = dt.trim().match(FCV_LOCAL_DATETIME_RE)
  if (!m) return null
  const dtObj = DateTime.fromObject(
    {
      year: parseInt(m[1], 10),
      month: parseInt(m[2], 10),
      day: parseInt(m[3], 10),
      hour: parseInt(m[4], 10),
      minute: parseInt(m[5], 10),
      second: m[6] ? parseInt(m[6], 10) : 0,
    },
    { zone }
  )
  return dtObj.isValid ? dtObj : null
}

function resolveNowMs(
  opts: { nowMs?: number; nowIso?: string; nowZone?: string },
  fallbackMs: number
): number {
  if (typeof opts.nowMs === 'number' && Number.isFinite(opts.nowMs)) return opts.nowMs
  const raw = opts.nowIso?.trim()
  if (!raw) return fallbackMs
  if (/[zZ]$/.test(raw) || /[+-]\d{2}:?\d{2}$/.test(raw)) {
    const ms = Date.parse(raw)
    return Number.isFinite(ms) ? ms : fallbackMs
  }
  const zone = opts.nowZone ?? FLICA_DEFAULT_NOW_ZONE
  const dt = parseLocalDatetimeInZone(raw.replace(' ', 'T'), zone)
  return dt ? dt.toUTC().toMillis() : fallbackMs
}

/** Instant of FLICA Out in the departure airport's local zone. */
export function flicaScheduledOutMs(leg: Pick<AirlineLeg, 'scheduled_out_local' | 'dep_airport'>): number | null {
  const raw = leg.scheduled_out_local
  if (!raw) return null
  const tz = getAirportIanaTimezone(leg.dep_airport) ?? FLICA_DEFAULT_NOW_ZONE
  const dt = parseLocalDatetimeInZone(raw, tz)
  return dt ? dt.toUTC().toMillis() : null
}

/**
 * True when the leg has already operated: AeroDataBox Off/On, or FLICA Out is
 * not after `nowMs` in the departure airport timezone.
 */
export function hasFlicaLegDeparted(
  leg: Pick<
    AirlineLeg,
    'scheduled_out_local' | 'dep_airport' | 'actual_off_local' | 'actual_on_local'
  >,
  nowMs: number
): boolean {
  const off = typeof leg.actual_off_local === 'string' && leg.actual_off_local.trim().length > 0
  const on = typeof leg.actual_on_local === 'string' && leg.actual_on_local.trim().length > 0
  if (off || on) return true
  const outMs = flicaScheduledOutMs(leg)
  if (outMs == null) return false
  return outMs <= nowMs
}

export function parseFlicaLastUpdatedMs(htmlOrText: string): number | null {
  const m = htmlOrText.match(LAST_UPDATED_FULL_RE)
  if (!m) return null
  const month = MONTH_MAP[m[1].toUpperCase()]
  if (!month) return null
  const zone = TZ_ABBR_TO_IANA[m[7].toUpperCase()] ?? FLICA_DEFAULT_NOW_ZONE
  const dt = DateTime.fromObject(
    {
      year: parseInt(m[3], 10),
      month,
      day: parseInt(m[2], 10),
      hour: parseInt(m[4], 10),
      minute: parseInt(m[5], 10),
      second: parseInt(m[6], 10),
    },
    { zone }
  )
  return dt.isValid ? dt.toUTC().toMillis() : null
}

/** Overlay pairing-page DEPL/ARRL/block onto matching month-refrigerator legs. */
export function overlayFlicaPairingLegs(base: AirlineLeg[], overlays: AirlineLeg[]): AirlineLeg[] {
  if (!overlays.length) return base
  const byId = new Map<string, AirlineLeg>()
  for (const leg of overlays) {
    if (leg.external_flight_id) byId.set(leg.external_flight_id, leg)
  }
  return base.map((leg) => {
    const o = byId.get(leg.external_flight_id)
    if (!o) return leg
    return {
      ...leg,
      scheduled_out_local: o.scheduled_out_local ?? leg.scheduled_out_local,
      scheduled_in_local: o.scheduled_in_local ?? leg.scheduled_in_local,
      block_minutes: o.block_minutes ?? leg.block_minutes,
    }
  })
}

function buildExternalFlightId(dateYmd: string, flightNumber: string, dep: string): string {
  const d = dateYmd.replace(/-/g, '')
  return `FLICA_${d}_${flightNumber}_${dep.toUpperCase()}`
}

function parseCrewLine(line: string): AirlineLegCrewMember[] {
  const crew: AirlineLegCrewMember[] = []
  const seen = new Set<string>()
  const normalized = line.replace(/\|/g, ' ')
  for (const m of normalized.matchAll(CREW_PAIR_RE)) {
    const position = m[1].toUpperCase()
    const employeeId = m[2]
    const name = m[3]
      .trim()
      .replace(/\|/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[.,;]+$/, '')
      .trim()
    if (!name) continue
    const key = `${position}:${employeeId}`
    if (seen.has(key)) continue
    seen.add(key)
    crew.push({ position, name, employeeId })
  }
  return crew
}

function mergeCrewMembers(
  existing: AirlineLegCrewMember[],
  incoming: AirlineLegCrewMember[]
): AirlineLegCrewMember[] {
  const out = [...existing]
  const seen = new Set(existing.map((m) => `${m.position}:${m.employeeId ?? m.name}`))
  for (const m of incoming) {
    const key = `${m.position}:${m.employeeId ?? m.name}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(m)
  }
  return out
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

/** CA-only complement → PIC; FO-only → SIC; both listed → unknown. */
function seatFromEquipComplement(complement: string): 'PIC' | 'SIC' | null {
  const hasCA = /CA\d{2}/i.test(complement)
  const hasFO = /FO\d{2}/i.test(complement)
  if (hasCA && !hasFO) return 'PIC'
  if (hasFO && !hasCA) return 'SIC'
  return null
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
 * Empty DH vs C cells stay distinct via `|` so a C-column `*` (AC swap) is not a deadhead.
 */
export function flicaHtmlToText(htmlOrText: string): string {
  let s = htmlOrText
  if (/<[a-z!?/]/i.test(s)) {
    s = s
      .replace(/<script[\s\S]*?<\/script>/gi, `\n${ROW_SENTINEL}\n`)
      .replace(/<style[\s\S]*?<\/style>/gi, `\n${ROW_SENTINEL}\n`)
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\s*br\s*\/?\s*>/gi, `\n${ROW_SENTINEL}\n`)
      .replace(
        /<\s*\/?\s*(tr|p|div|li|h[1-6]|pre|table|blockquote)\b[^>]*>/gi,
        `\n${ROW_SENTINEL}\n`
      )
      .replace(/<\s*\/\s*(td|th)\b[^>]*>/gi, '')
      .replace(/<\s*(td|th)\b[^>]*>/gi, '|')
      .replace(/<[^>]+>/g, ' ')
    s = s.replace(/\r/g, '\n').replace(/\n/g, ' ').replace(new RegExp(ROW_SENTINEL, 'g'), '\n')
  }
  return decodeBasicEntities(s)
    .replace(/\r/g, '\n')
    .replace(/\t/g, '|')
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
  | { kind: 'equip'; index: number; equip: string; seatFromEquip: 'PIC' | 'SIC' | null }
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

function splitCells(line: string): { cells: string[]; hadPipes: boolean } {
  const hadPipes = line.includes('|')
  if (hadPipes) {
    return { cells: line.split('|').map((c) => c.trim()), hadPipes }
  }
  return { cells: line.trim().split(/\s+/).filter(Boolean), hadPipes }
}

function parseRouteCell(raw: string): {
  dep: string
  arr: string | null
  gluedDep: string | null
} | null {
  const glued = raw.match(/^([A-Z]{3})-([A-Z]{3})(\d{4})?$/)
  if (glued) {
    return { dep: glued[1], arr: glued[2], gluedDep: glued[3] ?? null }
  }
  const gluedNoHyphen = raw.match(/^([A-Z]{3})([A-Z]{3})(\d{4})?$/)
  if (gluedNoHyphen) {
    return {
      dep: gluedNoHyphen[1],
      arr: gluedNoHyphen[2],
      gluedDep: gluedNoHyphen[3] ?? null,
    }
  }
  if (AIRPORT_RE.test(raw)) return { dep: raw, arr: null, gluedDep: null }
  return null
}

function isNoiseLine(line: string): boolean {
  const t = line.replace(/\|/g, ' ').trim()
  if (!t) return true
  if (/^D-END\b/i.test(t)) return true
  if (/\bT\.A\.F\.B\b/i.test(t)) return true
  if (/^Total:/i.test(t)) return true
  if (/^Crew:/i.test(t)) return true
  if (/Base\/Equip:/i.test(t)) return true
  if (/^GDO\b/i.test(t)) return true
  return false
}

function parseLegLine(line: string, index: number): ParseHit | null {
  if (isNoiseLine(line)) return null
  const { cells, hadPipes } = splitCells(line)
  let i = 0
  while (i < cells.length && cells[i] === '') i++
  if (i >= cells.length) return null

  if (DOW_RE.test(cells[i]!)) {
    i++
    while (i < cells.length && cells[i] === '') i++
  }

  const dayRaw = cells[i]
  if (!dayRaw || !/^\d{1,2}$/.test(dayRaw)) return null
  const dayNum = parseInt(dayRaw, 10)
  if (dayNum < 1 || dayNum > 31) return null
  i++

  const flags: string[] = []
  if (hadPipes) {
    while (i < cells.length && flags.length < 2 && !FLIGHT_NO_RE.test(cells[i]!)) {
      flags.push(cells[i]!)
      i++
    }
  } else if (i < cells.length && DH_MARK_RE.test(cells[i]!) && !FLIGHT_NO_RE.test(cells[i]!)) {
    flags.push(cells[i]!)
    i++
  }

  if (i >= cells.length || !FLIGHT_NO_RE.test(cells[i]!)) return null
  const flightNumber = cells[i++]!

  while (i < cells.length && cells[i] === '') i++
  if (i >= cells.length) return null

  const firstRoute = parseRouteCell(cells[i]!)
  if (!firstRoute) return null
  i++
  let dep = firstRoute.dep
  let arr = firstRoute.arr
  let gluedDep = firstRoute.gluedDep
  if (!arr) {
    while (i < cells.length && cells[i] === '') i++
    const arrRaw = cells[i]
    if (!arrRaw) return null
    const arrGlued = arrRaw.match(/^([A-Z]{3})(\d{4})?$/)
    if (!arrGlued || !AIRPORT_RE.test(arrGlued[1])) return null
    arr = arrGlued[1]
    gluedDep = gluedDep ?? arrGlued[2] ?? null
    i++
  }

  const remainder = cells.slice(i).join(' ')
  const dh = (flags[0] ?? '').trim()
  const isDeadhead = hadPipes ? DH_MARK_RE.test(dh) : /^(D|DH)$/i.test(dh)

  return {
    kind: 'leg',
    index,
    dayNum,
    isDeadhead,
    flightNumber,
    dep: dep.toUpperCase(),
    arr: arr.toUpperCase(),
    gluedDep,
    remainder,
  }
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
    hits.push({
      kind: 'equip',
      index: m.index,
      equip: m[1].toUpperCase(),
      seatFromEquip: seatFromEquipComplement(m[2] ?? ''),
    })
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

  let offset = 0
  for (const line of text.split('\n')) {
    const hit = parseLegLine(line, offset)
    if (hit) hits.push(hit)
    offset += line.length + 1
  }

  hits.sort((a, b) => a.index - b.index || a.kind.localeCompare(b.kind))
  return hits
}

function resolveRole(
  crew: AirlineLegCrewMember[],
  opts: FlicaParseOptions,
  seatFromEquip: 'PIC' | 'SIC' | null
): string {
  return detectOwnRole(crew, opts) ?? (crew.length === 0 ? seatFromEquip : null) ?? ''
}

/**
 * Parse Republic FLICA schedule detail text/HTML into AirlineLeg rows.
 * Walks every trip on the page. Pairing length is not capped (1-day turns,
 * 5-day lines, 6-day reserve, IROPS into days off / next month).
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
  let currentSeatFromEquip: 'PIC' | 'SIC' | null = null
  let prevLegYmd: string | null = null

  const applyCrewToCurrentTrip = (crew: AirlineLegCrewMember[]) => {
    currentCrew = mergeCrewMembers(currentCrew, crew)
    const role = resolveRole(currentCrew, opts, currentSeatFromEquip)
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
      currentSeatFromEquip = null
      prevLegYmd = null
      continue
    }
    if (hit.kind === 'equip') {
      currentEquip = hit.equip
      currentSeatFromEquip = hit.seatFromEquip
      const role = resolveRole(currentCrew, opts, currentSeatFromEquip)
      for (const leg of legs) {
        if (leg.trip_number === currentTrip && !leg.role) {
          leg.role = role
          if (currentEquip && !leg.fcv_aircraft_type) leg.fcv_aircraft_type = currentEquip
        }
      }
      continue
    }
    if (hit.kind === 'crew') {
      applyCrewToCurrentTrip(hit.crew)
      continue
    }

    const monthAbbr = currentMonthAbbr ?? 'JAN'
    const dateYmd = ymdForTripLeg(hit.dayNum, monthAbbr, year, prevLegYmd)
    if (!dateYmd) continue
    prevLegYmd = dateYmd
    if (hit.dep === hit.arr) continue
    if (hit.dep.length !== 3 || hit.arr.length !== 3) continue

    const nums = hit.remainder.match(/\b\d{4}\b/g) ?? []
    const gate = pickFlicaGateHhmm(nums, hit.gluedDep)
    const depHhmm = gate.depHhmm
    const arrHhmm = gate.arrHhmm
    const blockHhmm = gate.blockHhmm
    const blockMinutes = parseBlockMinutes(blockHhmm)
    const scheduledOut = hhmmToLocalDatetime(dateYmd, depHhmm)
    const scheduledIn = hhmmToLocalDatetime(dateYmd, arrHhmm)
    const role = resolveRole(currentCrew, opts, currentSeatFromEquip)

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

  const seenIds = new Set<string>()
  const unique: AirlineLeg[] = []
  for (const leg of legs) {
    if (seenIds.has(leg.external_flight_id)) continue
    seenIds.add(leg.external_flight_id)
    unique.push(leg)
  }
  return unique
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
    /**
     * Epoch ms for "now". Preferred over `nowIso` so Vercel UTC wall-clock is not
     * compared to airport-local FLICA times.
     */
    nowMs?: number
    /**
     * Naive `YYYY-MM-DDTHH:MM` local datetime, interpreted in `nowZone`
     * (default America/New_York). Absolute ISO with Z/offset is also accepted.
     */
    nowIso?: string
    nowZone?: string
    /** Exclude legs whose calendar date is after this YYYY-MM-DD (counts as scheduled). */
    excludeAfterYmd?: string
  } = {}
): AirlineLegFilterStats {
  const nowMs = resolveNowMs(opts, Date.now())
  const today =
    opts.todayYmd ??
    DateTime.fromMillis(nowMs, { zone: opts.nowZone ?? FLICA_DEFAULT_NOW_ZONE }).toFormat(
      'yyyy-MM-dd'
    )
  const excludeAfter = opts.excludeAfterYmd ?? (!opts.includeScheduled ? today : undefined)
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
    if (!opts.includeScheduled) {
      if (excludeAfter && date && date > excludeAfter) {
        excludedScheduled++
        continue
      }
      if (!hasFlicaLegDeparted(leg, nowMs)) {
        excludedScheduled++
        continue
      }
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
  opts: Parameters<typeof filterAirlineLegsWithStats>[1]
): AirlineLeg[] {
  return filterAirlineLegsWithStats(legs, opts).filtered
}
