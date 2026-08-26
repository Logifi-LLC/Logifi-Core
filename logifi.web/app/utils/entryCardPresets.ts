import type { LogbookColumnKey } from './logbookTypes'

export type EntryCardPresetId =
  | 'student'
  | 'private'
  | 'commercial'
  | 'airline'
  | 'cfi'
  | 'custom'

export interface EntryCardPreset {
  id: EntryCardPresetId
  label: string
  description: string
  fields: LogbookColumnKey[]
}

export const ENTRY_CARD_HEADER_KEYS: readonly LogbookColumnKey[] = [
  'date',
  'fromTo',
  'aircraft',
  'identification',
  'total',
]

/** Shown in footer when enabled, not as a detail chip. */
export const ENTRY_CARD_FOOTER_KEYS: readonly LogbookColumnKey[] = ['remarks']

/** Hours and counts on the iOS card metrics strip, not as chips. */
export const ENTRY_CARD_METRIC_KEYS: readonly LogbookColumnKey[] = [
  'pic',
  'sic',
  'dualR',
  'solo',
  'night',
  'nvg',
  'actual',
  'hood',
  'dualG',
  'xc',
  'dayLandings',
  'nightLandings',
  'approach',
]

export const ENTRY_CARD_PRESETS: readonly EntryCardPreset[] = [
  {
    id: 'student',
    label: 'Student',
    description: 'Dual, solo, cross-country, and landings',
    fields: ['dualR', 'solo', 'xc', 'dayLandings', 'nightLandings', 'conditions'],
  },
  {
    id: 'private',
    label: 'Private / GA',
    description: 'PIC, night, cross-country, and conditions',
    fields: ['pic', 'night', 'xc', 'conditions', 'remarks'],
  },
  {
    id: 'commercial',
    label: 'Commercial / Instrument',
    description: 'Instrument time, approaches, and night landings',
    fields: ['pic', 'actual', 'hood', 'approach', 'nightLandings', 'conditions'],
  },
  {
    id: 'airline',
    label: 'Airline / Part 121',
    description: 'Flight number, SIC, PIC, and night',
    fields: ['flightNumber', 'sic', 'pic', 'night', 'conditions'],
  },
  {
    id: 'cfi',
    label: 'CFI',
    description: 'Dual given, dual received, and PIC',
    fields: ['dualG', 'dualR', 'pic', 'conditions'],
  },
] as const

export function isHeaderZoneKey(key: LogbookColumnKey): boolean {
  return (ENTRY_CARD_HEADER_KEYS as readonly string[]).includes(key)
}

export function isFooterZoneKey(key: LogbookColumnKey): boolean {
  return (ENTRY_CARD_FOOTER_KEYS as readonly string[]).includes(key)
}

export function isDetailChipKey(key: LogbookColumnKey): boolean {
  return !isHeaderZoneKey(key) && !isFooterZoneKey(key)
}

export function isMetricZoneKey(key: LogbookColumnKey): boolean {
  return (ENTRY_CARD_METRIC_KEYS as readonly string[]).includes(key)
}
