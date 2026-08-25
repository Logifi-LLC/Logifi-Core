export const LOGBOOK_TRANSFER_SOURCE_OPTIONS = [
  { value: '', label: 'Not sure' },
  { value: 'logten', label: 'LogTen' },
  { value: 'foreflight', label: 'ForeFlight' },
  { value: 'csv', label: 'CSV / other' },
  { value: 'other', label: 'Other' },
] as const

export type LogbookTransferSourceApp = (typeof LOGBOOK_TRANSFER_SOURCE_OPTIONS)[number]['value']
