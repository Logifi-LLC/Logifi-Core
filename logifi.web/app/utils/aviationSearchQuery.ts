import { canonicalizeAirportCodeForMatch } from '../../shared/airportCodeCanonical'
import {
  formatRegistrationForExport,
  normalizeRegistrationKey,
} from '../../shared/logbookDataBridge/formatters'
import { getEntryAirportCodes } from './validation'
import type { LogEntry } from './logbookTypes'

export type AviationSearchTokenKind = 'tail' | 'airport' | 'date' | 'condition' | 'text'

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

export interface ParsedAviationSearchQuery {
  tokens: AviationSearchToken[]
  chips: AviationSearchChip[]
}

export type AviationConditionKey =
  | 'nightVfr'
  | 'ifr'
  | 'simInstrument'
  | 'actualInstrument'
  | 'crossCountry'
  | 'nvg'

const N_NUMBER_RE = /^N\d{1,5}[A-Z]{0,2}$/
const US_BARE_TAIL_RE = /^\d{1,5}[A-Z]{0,2}$/
const ISO_DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const ISO_MONTH_RE = /^\d{4}-\d{2}$/
const ISO_YEAR_RE = /^(19|20)\d{2}$/
const ICAO_RE = /^[A-Z]{4}$/
const IATA_RE = /^[A-Z]{3}$/

const CONDITION_ALIASES: Record<string, AviationConditionKey> = {
  night: 'nightVfr',
  nightvfr: 'nightVfr',
  ifr: 'ifr',
  instrument: 'actualInstrument',
  xc: 'crossCountry',
  'cross-country': 'crossCountry',
  crosscountry: 'crossCountry',
  nvg: 'nvg',
}

const CONDITION_CHIP_LABELS: Record<AviationConditionKey, string> = {
  nightVfr: 'Night',
  ifr: 'IFR',
  simInstrument: 'Simulated Instrument',
  actualInstrument: 'Instrument',
  crossCountry: 'Cross-country',
  nvg: 'NVG',
}

function classifyToken(raw: string, index: number): AviationSearchToken {
  const trimmed = raw.trim()
  const upper = trimmed.toUpperCase()
  const lower = trimmed.toLowerCase()

  if (ISO_DAY_RE.test(trimmed) || ISO_MONTH_RE.test(trimmed) || ISO_YEAR_RE.test(trimmed)) {
    return { kind: 'date', raw: trimmed, value: trimmed, index }
  }

  const condition = CONDITION_ALIASES[lower]
  if (condition) {
    return { kind: 'condition', raw: trimmed, value: condition, index }
  }

  if (N_NUMBER_RE.test(upper)) {
    return { kind: 'tail', raw: trimmed, value: upper, index }
  }

  if (US_BARE_TAIL_RE.test(upper) && !ISO_YEAR_RE.test(upper)) {
    const normalized = formatRegistrationForExport(upper, { defaultCountry: 'US' })
    return { kind: 'tail', raw: trimmed, value: normalized || upper, index }
  }

  if (ICAO_RE.test(upper) || IATA_RE.test(upper)) {
    return { kind: 'airport', raw: trimmed, value: upper, index }
  }

  return { kind: 'text', raw: trimmed, value: lower, index }
}

function chipLabel(token: AviationSearchToken): string {
  switch (token.kind) {
    case 'tail':
      return `Tail ${token.value}`
    case 'airport':
      return `Airport ${token.value}`
    case 'date':
      return `Date ${token.value}`
    case 'condition':
      return CONDITION_CHIP_LABELS[token.value as AviationConditionKey] || token.raw
    default:
      return token.raw
  }
}

export function parseAviationSearchQuery(query: string): ParsedAviationSearchQuery {
  const parts = query.trim().split(/\s+/).filter(Boolean)
  const tokens = parts.map((raw, index) => classifyToken(raw, index))
  const chips = tokens.map((token) => ({
    id: `${token.kind}-${token.index}`,
    kind: token.kind,
    label: chipLabel(token),
    raw: token.raw,
    index: token.index,
  }))
  return { tokens, chips }
}

export function removeQueryToken(query: string, index: number): string {
  const parsed = parseAviationSearchQuery(query)
  return parsed.tokens
    .filter((token) => token.index !== index)
    .map((token) => token.raw)
    .join(' ')
}

function normalizedRegistration(value: string | null | undefined): string {
  return normalizeRegistrationKey(value ?? '')
}

function tokenMatchesTail(entry: LogEntry, token: AviationSearchToken): boolean {
  const entryReg = normalizedRegistration(entry.registration)
  if (!entryReg) return false
  const needle = normalizedRegistration(token.value) || token.value.toUpperCase()
  if (!needle) return false
  return entryReg === needle || entryReg.includes(needle)
}

function tokenMatchesAirport(
  entry: LogEntry,
  token: AviationSearchToken,
  classifiedAirports?: ReadonlySet<string>
): boolean {
  const needle = token.value.toUpperCase()
  const needleCanon = canonicalizeAirportCodeForMatch(needle)
  const codes = getEntryAirportCodes(entry, classifiedAirports)
  return codes.some((code) => {
    const upper = code.toUpperCase()
    const canon = canonicalizeAirportCodeForMatch(upper)
    return upper === needle || canon === needleCanon || upper === needleCanon || canon === needle
  })
}

function tokenMatchesDate(entry: LogEntry, token: AviationSearchToken): boolean {
  const date = (entry.date || '').slice(0, 10)
  if (!date) return false
  return date.startsWith(token.value)
}

function tokenMatchesCondition(entry: LogEntry, token: AviationSearchToken): boolean {
  const key = token.value as AviationConditionKey
  const conditions = entry.flightConditions || []
  const hasCondition = (value: string) =>
    conditions.some((cond) => cond.toLowerCase() === value.toLowerCase())

  if (key === 'nightVfr') {
    const nightTime = entry.flightTime?.night ?? 0
    const nightTakeoffs = entry.performance?.nightTakeoffs ?? 0
    const nightLandings = entry.performance?.nightLandings ?? 0
    return (
      hasCondition('nightVfr') ||
      conditions.some((cond) => cond.toLowerCase().includes('night')) ||
      nightTime > 0 ||
      nightTakeoffs > 0 ||
      nightLandings > 0
    )
  }

  if (key === 'ifr' || key === 'actualInstrument' || key === 'simInstrument') {
    const actual = entry.flightTime?.actualInstrument ?? 0
    const simulated = entry.flightTime?.simulatedInstrument ?? 0
    return (
      hasCondition('ifr') ||
      hasCondition('actualInstrument') ||
      hasCondition('simInstrument') ||
      conditions.some((cond) => cond.toLowerCase().includes('instrument') || cond.toLowerCase() === 'ifr') ||
      actual > 0 ||
      simulated > 0
    )
  }

  if (key === 'crossCountry') {
    const xc = entry.flightTime?.crossCountry ?? 0
    return hasCondition('crossCountry') || xc > 0
  }

  if (key === 'nvg') {
    const nvg = entry.flightTime?.nvg ?? 0
    return hasCondition('nvg') || nvg > 0
  }

  return hasCondition(key)
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
    entry.trainingInstructor,
    entry.flightNumber,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(token.value)
}

export function entryMatchesAviationQuery(
  entry: LogEntry,
  parsed: ParsedAviationSearchQuery,
  classifiedAirports?: ReadonlySet<string>
): boolean {
  if (parsed.tokens.length === 0) return true

  return parsed.tokens.every((token) => {
    switch (token.kind) {
      case 'tail':
        return tokenMatchesTail(entry, token)
      case 'airport':
        return tokenMatchesAirport(entry, token, classifiedAirports)
      case 'date':
        return tokenMatchesDate(entry, token)
      case 'condition':
        return tokenMatchesCondition(entry, token)
      default:
        return tokenMatchesText(entry, token)
    }
  })
}
