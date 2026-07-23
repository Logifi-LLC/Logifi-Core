import type { DigifiTemplateColumn } from './digifiTypes'
import { formatRegistrationForExport } from '../../shared/logbookDataBridge/formatters'
import type { LogbookColumnKey } from './logbookTypes'

export interface DigifiCorrectionFeedbackContext {
  registration?: string
  aircraftMakeModel?: string
  aircraftCategoryClass?: string
  departure?: string
  destination?: string
  route?: string
}

/** Persisted digifi_correction_feedback row shape used by personalization. */
export interface DigifiCorrectionFeedbackRow {
  field_key: string | null
  raw_value: string | null
  raw_value_key: string | null
  corrected_value: string | null
  corrected_value_key: string | null
  context_key: string | null
  context: Record<string, unknown> | null
  sample_count: number | null
  last_corrected_at: string | null
}

function compactSpaces(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeDigifiAircraftText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return compactSpaces(value).toUpperCase()
}

export function normalizeDigifiRegistrationKey(value: unknown): string {
  return formatRegistrationForExport(value)
}

/** ICAO/IATA-style airport / navaid token for Digifi feedback + personalization. */
export function normalizeDigifiAirportKey(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function normalizeDigifiFeedbackValue(
  fieldKey: LogbookColumnKey | null | undefined,
  value: unknown
): string {
  if (typeof value !== 'string') return ''
  if (fieldKey === 'identification') {
    return normalizeDigifiRegistrationKey(value)
  }
  if (fieldKey === 'departure' || fieldKey === 'destination' || fieldKey === 'route') {
    if (fieldKey === 'route') {
      return compactSpaces(value)
        .toUpperCase()
        .split(/\s+/)
        .map((token) => normalizeDigifiAirportKey(token))
        .filter(Boolean)
        .join(' ')
    }
    return normalizeDigifiAirportKey(value)
  }
  return normalizeDigifiAircraftText(value)
}

export function buildDigifiFeedbackContextFromRow(
  row: { cells: Record<string, string> },
  columns: DigifiTemplateColumn[]
): DigifiCorrectionFeedbackContext {
  const getFieldValue = (fieldKey: LogbookColumnKey): string => {
    const column = columns.find((col) => col.fieldKey === fieldKey)
    if (!column) return ''
    return row.cells?.[column.id] ?? ''
  }

  const explicitCategory = getFieldValue('categoryClass')
  const inferredCategory =
    explicitCategory ||
    columns.find((col) => col.fieldKey === 'categoryClass' && col.categoryClassValue && (row.cells?.[col.id] ?? '').trim())?.categoryClassValue ||
    ''

  return {
    registration: getFieldValue('identification'),
    aircraftMakeModel: getFieldValue('aircraft'),
    aircraftCategoryClass: inferredCategory,
    departure: getFieldValue('departure'),
    destination: getFieldValue('destination'),
    route: getFieldValue('route'),
  }
}

export function buildDigifiFeedbackContextKey(
  fieldKey: LogbookColumnKey | null | undefined,
  context: DigifiCorrectionFeedbackContext
): string {
  if (fieldKey === 'identification') {
    return [
      `aircraft:${normalizeDigifiAircraftText(context.aircraftMakeModel ?? '')}`,
      `category:${normalizeDigifiAircraftText(context.aircraftCategoryClass ?? '')}`,
    ].join('|')
  }

  if (fieldKey === 'aircraft') {
    return [
      `registration:${normalizeDigifiRegistrationKey(context.registration ?? '')}`,
      `category:${normalizeDigifiAircraftText(context.aircraftCategoryClass ?? '')}`,
    ].join('|')
  }

  if (fieldKey === 'departure' || fieldKey === 'destination' || fieldKey === 'route') {
    return [
      `dep:${normalizeDigifiAirportKey(context.departure ?? '')}`,
      `dest:${normalizeDigifiAirportKey(context.destination ?? '')}`,
      `route:${normalizeDigifiFeedbackValue('route', context.route ?? '')}`,
    ].join('|')
  }

  return [
    `registration:${normalizeDigifiRegistrationKey(context.registration ?? '')}`,
    `aircraft:${normalizeDigifiAircraftText(context.aircraftMakeModel ?? '')}`,
  ].join('|')
}
