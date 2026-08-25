import { canonicalizeAirportCodeForMatch } from '../../shared/airportCodeCanonical'
import { normalizeRegistrationKey } from '../../shared/logbookDataBridge/formatters'
import { getEntryAirportCodes } from './validation'
import type { LogEntry } from './logbookTypes'

export type AviationSearchTokenKind = 'date' | 'tail' | 'airport' | 'text'

export interface AviationSearchToken {
  kind: AviationSearchTokenKind
  raw: string
  value: string
  index: number
}

export interface AviationSearchChip {
  id: string
  kind: AviationSearchTokenKind
  label: string
  raw: string
  index: number
}

export interface ParsedAviationSearch {
  tokens: AviationSearchToken[]
  chips: AviationSearchChip[]
}

const ISO_DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const MDY_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
const MD_RE = /^(\d{1,2})\/(\d{1,2})$/
const N_TAIL_RE = /^N[A-Z0-9]{1,5}$/i
const AIRPORT_CODE_RE = /^[A-Z0-9]{3,4}$/

export interface ParseAviationSearchOptions {
  knownTails?: ReadonlySet<string>
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function parseMonthDay(month: string, day: string): { month: number; day: number } | null {
  const m = Number(month)
  const d = Number(day)
  if (!Number.isInteger(m) || !Number.isInteger(d) || m < 1 || m > 12 || d < 1 || d > 31) {
    return null
  }
  return { month: m, day: d }
}

function isKnownTail(token: string, knownTails?: ReadonlySet<string>): boolean {
  if (!knownTails || knownTails.size === 0) return false
  const upper = token.trim().toUpperCase()
  const normalized = normalizeRegistrationKey(token)
  return knownTails.has(upper) || (!!normalized && knownTails.has(normalized))
}

function isAirportToken(token: string): boolean {
  const upper = token.trim().toUpperCase()
  if (!AIRPORT_CODE_RE.test(upper)) return false
  const canon = canonicalizeAirportCodeForMatch(upper)
  if (canon !== upper) return true
  return upper.length === 4
}

function classifyToken(
  raw: string,
  index: number,
  knownTails?: ReadonlySet<string>
): AviationSearchToken {
  const trimmed = raw.trim()
  const iso = trimmed.match(ISO_DAY_RE)
  if (iso) {
    return { kind: 'date', raw: trimmed, value: trimmed, index }
  }

  const mdy = trimmed.match(MDY_RE)
  if (mdy) {
    const md = parseMonthDay(mdy[1], mdy[2])
    if (md) {
      return {
        kind: 'date',
        raw: trimmed,
        value: `${mdy[3]}-${pad2(md.month)}-${pad2(md.day)}`,
        index,
      }
    }
  }

  const mdOnly = trimmed.match(MD_RE)
  if (mdOnly) {
    const md = parseMonthDay(mdOnly[1], mdOnly[2])
    if (md) {
      return {
        kind: 'date',
        raw: trimmed,
        value: `any:${pad2(md.month)}-${pad2(md.day)}`,
        index,
      }
    }
  }

  const upper = trimmed.toUpperCase()
  if (N_TAIL_RE.test(upper) || isKnownTail(trimmed, knownTails)) {
    return { kind: 'tail', raw: trimmed, value: upper, index }
  }

  if (isAirportToken(trimmed)) {
    return {
      kind: 'airport',
      raw: trimmed,
      value: canonicalizeAirportCodeForMatch(upper),
      index,
    }
  }

  return { kind: 'text', raw: trimmed, value: trimmed.toLowerCase(), index }
}

export function parseAviationSearch(
  query: string,
  options: ParseAviationSearchOptions = {}
): ParsedAviationSearch {
  const parts = query.trim().split(/\s+/).filter(Boolean)
  const tokens = parts.map((raw, index) =>
    classifyToken(raw, index, options.knownTails)
  )
  const chips = tokens.map((token) => ({
    id: `${token.kind}-${token.index}`,
    kind: token.kind,
    label: token.raw,
    raw: token.raw,
    index: token.index,
  }))
  return { tokens, chips }
}

export function stripSearchToken(query: string, raw: string): string {
  const parts = query.trim().split(/\s+/).filter(Boolean)
  let removed = false
  const kept = parts.filter((part) => {
    if (!removed && part === raw) {
      removed = true
      return false
    }
    return true
  })
  return kept.join(' ')
}

function tokenMatchesDate(entry: LogEntry, token: AviationSearchToken): boolean {
  const date = (entry.date || '').slice(0, 10)
  if (!date) return false
  if (token.value.startsWith('any:')) {
    return date.slice(5) === token.value.slice(4)
  }
  return date === token.value
}

function tokenMatchesTail(entry: LogEntry, token: AviationSearchToken): boolean {
  const entryKey = normalizeRegistrationKey(entry.registration)
  const tokenKey = normalizeRegistrationKey(token.value)
  if (!entryKey || !tokenKey) return false
  return entryKey === tokenKey
}

function tokenMatchesAirport(
  entry: LogEntry,
  token: AviationSearchToken,
  classifiedAirports?: ReadonlySet<string>
): boolean {
  const needle = canonicalizeAirportCodeForMatch(token.value)
  const codes = getEntryAirportCodes(entry, classifiedAirports)
  return codes.some((code) => {
    const upper = (code || '').toUpperCase()
    const canon = canonicalizeAirportCodeForMatch(upper)
    return canon === needle || upper === needle || upper === token.raw.toUpperCase()
  })
}

function tokenMatchesText(entry: LogEntry, token: AviationSearchToken): boolean {
  const haystack = [
    entry.aircraftMakeModel,
    entry.registration,
    entry.departure,
    entry.destination,
    entry.route,
    entry.remarks,
    entry.trainingElements,
    entry.date,
    entry.flightNumber,
    ...(entry.tags || []),
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(token.value)
}

export function entryMatchesAviationSearch(
  entry: LogEntry,
  parsed: ParsedAviationSearch,
  classifiedAirports?: ReadonlySet<string>
): boolean {
  if (parsed.tokens.length === 0) return true

  const dates = parsed.tokens.filter((token) => token.kind === 'date')
  const tails = parsed.tokens.filter((token) => token.kind === 'tail')
  const airports = parsed.tokens.filter((token) => token.kind === 'airport')
  const texts = parsed.tokens.filter((token) => token.kind === 'text')

  if (dates.length > 0 && !dates.some((token) => tokenMatchesDate(entry, token))) {
    return false
  }
  if (tails.length > 0 && !tails.some((token) => tokenMatchesTail(entry, token))) {
    return false
  }
  if (
    airports.length > 0 &&
    !airports.some((token) => tokenMatchesAirport(entry, token, classifiedAirports))
  ) {
    return false
  }
  if (texts.length > 0 && !texts.every((token) => tokenMatchesText(entry, token))) {
    return false
  }
  return true
}
