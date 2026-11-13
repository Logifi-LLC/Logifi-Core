import { parseImportDuration } from '../../shared/logbookDataBridge/formatters'
import type { FlightTimeBreakdown, FlightTimeKey, LogEntry } from './logbookTypes'
import {
  validateAircraftRegistration,
  validateAirportCode,
  validateDate,
  validateDateFormat,
  validateFlightTime,
  validateNumericPrecision,
  validatePart61RequiredFields,
  type ValidationResult,
} from './validation'

export const ENTRY_TIME_FORMAT_ERROR = 'Enter time as 1.3 or 1:18'

export type DurationParseResult =
  | { status: 'empty'; value: null }
  | { status: 'incomplete' }
  | { status: 'ok'; value: number }
  | { status: 'invalid'; error: string }

const INCOMPLETE_DURATION_RE = /^(?:\d+[:+]|\d+\.|\.)$/

const FLIGHT_TIME_FIELDS = new Set<string>([
  'total',
  'pic',
  'sic',
  'dual',
  'solo',
  'night',
  'nvg',
  'actualInstrument',
  'simulatedInstrument',
  'crossCountry',
  'dualGiven',
  'ffs',
  'ftd',
  'atd',
])

/** True while the pilot is still typing a decimal or H:MM duration. */
export function isIncompleteEntryDuration(raw: string): boolean {
  return INCOMPLETE_DURATION_RE.test(raw.trim())
}

/**
 * Parse a duration typed in the logbook entry form.
 * Reuses import parsing (decimal hours or H:MM) — does not invent a new format.
 */
export function parseEntryFormDuration(raw: string): DurationParseResult {
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed === '-') return { status: 'empty', value: null }
  if (isIncompleteEntryDuration(trimmed)) return { status: 'incomplete' }
  const parsed = parseImportDuration(trimmed)
  if (parsed === null) return { status: 'invalid', error: ENTRY_TIME_FORMAT_ERROR }
  return { status: 'ok', value: parsed }
}

/** Commit a keystroke into a numeric field. Incomplete input is left unchanged. */
export function applyEntryFormDurationInput(
  raw: string,
  assign: (value: number | null) => void
): string | null {
  const result = parseEntryFormDuration(raw)
  if (result.status === 'incomplete') return null
  if (result.status === 'empty') {
    assign(null)
    return null
  }
  if (result.status === 'invalid') return result.error
  assign(result.value)
  return null
}

/** Tenth-hour display for an unfocused duration field. Never use this as :value while typing. */
export function formatEntryTimeDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return Number(value).toFixed(1)
}

/**
 * Visible text for a duration input. While the field is focused, `draft` is the raw
 * typed string so Vue cannot rewrite "1" to "1.0" mid-keystroke.
 */
export function durationFieldDisplay(
  draft: string | undefined,
  value: number | null | undefined
): string {
  return draft !== undefined ? draft : formatEntryTimeDisplay(value)
}

/** Keystroke: keep the raw draft, update the model when the text is a complete duration. */
export function onEntryDurationKeystroke(
  raw: string,
  assign: (value: number | null) => void
): { draft: string; formatError: string | null } {
  const result = parseEntryFormDuration(raw)
  if (result.status === 'incomplete') return { draft: raw, formatError: null }
  if (result.status === 'empty') {
    assign(null)
    return { draft: raw, formatError: null }
  }
  if (result.status === 'invalid') return { draft: raw, formatError: result.error }
  assign(result.value)
  return { draft: raw, formatError: null }
}

/** Blur path: empty, a parsed duration, or the format error. */
export function finalizeEntryFormDuration(raw: string): DurationParseResult {
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed === '-') return { status: 'empty', value: null }
  const parsed = parseImportDuration(trimmed)
  if (parsed === null) return { status: 'invalid', error: ENTRY_TIME_FORMAT_ERROR }
  return { status: 'ok', value: parsed }
}

/** Blur: normalize/format the model. Invalid input keeps the last good value. */
export function onEntryDurationBlur(
  raw: string,
  getValue: () => number | null | undefined,
  assign: (value: number | null) => void
): { display: string; formatError: string | null } {
  const finalized = finalizeEntryFormDuration(raw)
  if (finalized.status === 'ok') {
    assign(finalized.value)
    return { display: formatEntryTimeDisplay(finalized.value), formatError: null }
  }
  if (finalized.status === 'empty') {
    assign(null)
    return { display: '', formatError: null }
  }
  return { display: formatEntryTimeDisplay(getValue()), formatError: ENTRY_TIME_FORMAT_ERROR }
}

/**
 * Commit leftover focused drafts before save so Enter-to-submit cannot skip blur.
 * Returns field → format error for any genuinely invalid leftover text.
 */
export function commitDurationDrafts(
  drafts: Record<string, string>,
  getValue: (field: string) => number | null | undefined,
  assign: (field: string, value: number | null) => void
): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  const fields = Object.keys(drafts)
  for (const field of fields) {
    const raw = drafts[field]
    if (raw === undefined) continue
    const result = onEntryDurationBlur(raw, () => getValue(field), (value) => assign(field, value))
    delete drafts[field]
    if (result.formatError) errors[field] = result.formatError
  }
  return { ok: Object.keys(errors).length === 0, errors }
}

const EXCEEDS_TOTAL_LABEL: Record<string, string> = {
  pic: 'PIC',
  sic: 'SIC',
  dual: 'Dual Received',
  night: 'Night',
  nvg: 'NVG',
  actualInstrument: 'Actual Instrument',
  simulatedInstrument: 'Simulated Instrument',
  crossCountry: 'Cross-Country',
  solo: 'Solo',
  dualGiven: 'Dual Given',
}

export function toActionableFieldError(result: ValidationResult): string {
  const { field, message } = result
  if (/exceeds total/i.test(message)) {
    const label = EXCEEDS_TOTAL_LABEL[field]
    if (label) return `Total must be at least ${label}`
    if (field === 'total' && /PIC/i.test(message)) return 'Total must be at least PIC'
  }
  if (field === 'date' && /required/i.test(message)) return 'Enter a date'
  if (field === 'date' && /future/i.test(message)) return 'Date cannot be in the future'
  if (field === 'date' && /invalid date/i.test(message)) return 'Enter a valid date'
  if (field === 'departure' && /required/i.test(message)) return 'Enter a departure airport'
  if (field === 'destination' && /required/i.test(message)) return 'Enter a destination airport'
  if (
    (field === 'departure' || field === 'destination') &&
    /not in a valid format/i.test(message)
  ) {
    return 'Enter a 3–4 character airport code'
  }
  if (field === 'aircraftMakeModel' && /required/i.test(message)) {
    return 'Enter aircraft make and model'
  }
  if (field === 'registration' && /required/i.test(message)) {
    return 'Enter aircraft identification'
  }
  if (field === 'aircraftCategoryClass' && /required/i.test(message)) {
    return 'Select aircraft category/class'
  }
  if (field === 'total' && /required/i.test(message)) return 'Enter total time'
  if (field === 'pic' && /PIC, Solo, SIC, or Dual/i.test(message)) {
    return 'Enter PIC, SIC, Solo, or Dual Received'
  }
  if (field === 'role' && /required/i.test(message)) return 'Select a role'
  if (/cannot be negative/i.test(message)) return 'Time cannot be negative'
  return message
}

function pickResult(results: ValidationResult[]): ValidationResult | null {
  return results.find((r) => r.type === 'error') ?? results.find((r) => r.type === 'warning') ?? null
}

/**
 * Field-level message for blur. Uses the same validators as save; simulator
 * entries skip Part 61 / flight-time rules (same as useValidation).
 */
export function fieldErrorMessage(entry: LogEntry, field: string): string | null {
  const results: ValidationResult[] = []
  const isSimulator = entry.logbookType === 'simulator'

  if (field === 'date') {
    results.push(...validateDate(entry))
    if (entry.date) results.push(...validateDateFormat(entry.date))
    if (!isSimulator) {
      results.push(...validatePart61RequiredFields(entry).filter((r) => r.field === 'date'))
    }
  } else if (field === 'departure' || field === 'destination') {
    results.push(...validateAirportCode(entry[field], field))
    if (!isSimulator) {
      results.push(...validatePart61RequiredFields(entry).filter((r) => r.field === field))
    }
  } else if (field === 'registration') {
    results.push(...validateAircraftRegistration(entry.registration))
    if (!isSimulator) {
      results.push(
        ...validatePart61RequiredFields(entry).filter((r) => r.field === 'registration')
      )
    }
  } else if (
    field === 'aircraftMakeModel' ||
    field === 'aircraftCategoryClass' ||
    field === 'role'
  ) {
    if (!isSimulator) {
      results.push(...validatePart61RequiredFields(entry).filter((r) => r.field === field))
    }
  } else if (field === 'categoryClassTime') {
    const value = entry.categoryClassTime
    if (value !== null && value !== undefined) {
      results.push(...validateNumericPrecision(value, field))
    }
  } else if (FLIGHT_TIME_FIELDS.has(field)) {
    if (!isSimulator) {
      const ft = entry.flightTime
      const value = ft ? ft[field as FlightTimeKey] : null
      if (value !== null && value !== undefined) {
        results.push(...validateNumericPrecision(value, field))
      }
      const timeResults = validateFlightTime(entry)
      results.push(...timeResults.filter((r) => r.field === field))
      if (field === 'total') {
        const picExceeds = timeResults.find(
          (r) => r.field === 'pic' && /exceeds total/i.test(r.message)
        )
        if (picExceeds) {
          results.push({ ...picExceeds, field: 'total' })
        }
      }
      results.push(...validatePart61RequiredFields(entry).filter((r) => r.field === field))
    } else {
      const ft = entry.flightTime
      const value = ft ? (ft[field as keyof FlightTimeBreakdown] as number | null | undefined) : null
      if (value !== null && value !== undefined) {
        results.push(...validateNumericPrecision(value, field))
      }
    }
  }

  const picked = pickResult(results)
  return picked ? toActionableFieldError(picked) : null
}
