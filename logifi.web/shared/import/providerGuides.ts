import type { ImportProviderKey } from './types'

export interface ProviderGuide {
  key: ImportProviderKey
  label: string
  emoji: string
  description: string
  steps: string[]
}

/**
 * Exact export instruction copy for the provider-driven import modal.
 * Keep steps short and actionable — pilots follow these while exporting.
 */
export const PROVIDER_GUIDES: Record<ImportProviderKey, ProviderGuide> = {
  foreflight: {
    key: 'foreflight',
    label: 'ForeFlight',
    emoji: '✈️',
    description: 'ForeFlight Logbook CSV (Aircraft + Flights tables).',
    steps: [
      'Log into ForeFlight on the Web (appstore/web portal).',
      'Navigate to Logbook -> Export -> Download ForeFlight CSV.',
      'Drop the file below. Aircraft, times, landings, and remarks will map automatically.',
    ],
  },
  myflightbook: {
    key: 'myflightbook',
    label: 'MyFlightBook',
    emoji: '📘',
    description: 'MyFlightBook UTF-8 CSV export.',
    steps: [
      'Log into MyFlightBook.com.',
      'Go to Logbook -> View Logbook -> Export -> CSV.',
      'Drop the file below. Custom fields and landing breakdowns will map automatically.',
    ],
  },
  logten: {
    key: 'logten',
    label: 'LogTen Pro',
    emoji: '📱',
    description:
      'Prefer Reports → Exporters → Export Flights (Tab). Dynamic Export is secondary.',
    steps: [
      'Open LogTen Pro on Mac or iOS.',
      'Go to File -> Export -> Reports / CSV (or Export Logbook). Prefer Reports → Exporters → Export Flights (Tab); set UTC / 24-hour time before exporting. Dynamic Export may omit filtered flights.',
      'Drop the file below. Flight times, night, and cross-country attributes will map automatically.',
    ],
  },
  custom_csv: {
    key: 'custom_csv',
    label: 'Excel / Standard CSV',
    emoji: '📊',
    description: 'Generic spreadsheet with a header row.',
    steps: [
      'Ensure your spreadsheet contains a Header Row (e.g., Date, Aircraft ID, Total Time, Remarks).',
      'Export or Save As CSV (`.csv`).',
      'Drop the file below to launch our interactive column mapper.',
    ],
  },
}

export const PROVIDER_GUIDE_LIST: ProviderGuide[] = [
  PROVIDER_GUIDES.foreflight,
  PROVIDER_GUIDES.myflightbook,
  PROVIDER_GUIDES.logten,
  PROVIDER_GUIDES.custom_csv,
]
