import type { DigifiTemplateColumn } from './digifiTypes'
import type { LogbookColumnKey } from './logbookTypes'

export interface DigifiCorrectionFeedbackContext {
  registration?: string
  aircraftMakeModel?: string
  aircraftCategoryClass?: string
}

function compactSpaces(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeDigifiAircraftText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return compactSpaces(value).toUpperCase()
}

export function normalizeDigifiRegistrationKey(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function normalizeDigifiFeedbackValue(
  fieldKey: LogbookColumnKey | null | undefined,
  value: unknown
): string {
  if (typeof value !== 'string') return ''
  if (fieldKey === 'identification') {
    return normalizeDigifiRegistrationKey(value)
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

  return [
    `registration:${normalizeDigifiRegistrationKey(context.registration ?? '')}`,
    `aircraft:${normalizeDigifiAircraftText(context.aircraftMakeModel ?? '')}`,
  ].join('|')
}
