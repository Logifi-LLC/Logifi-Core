import { formatDisplayDate, formatEntryAirportCode } from './entryFieldDisplay'
import { formatDecimalHours } from '../../shared/logbookDataBridge/formatters'
import { normalizeCalendarYmd } from '../../shared/localCalendarDate'
import { sortEntriesByDateAndOOOI } from '../../shared/oooiSort'
import { getTotalApproachCount, type LogEntry } from './logbookTypes'
import { filterEntriesForTotalsReport, roundTenths } from './totalsReport'

export const DEFAULT_ROWS_PER_PAGE = 13
export const MIN_ROWS_PER_PAGE = 8
export const MAX_ROWS_PER_PAGE = 20

export const PAPER_LOGBOOK_CERTIFICATION =
  'I certify that the entries in this log are true.'

export const PAPER_NUMERIC_KEYS = [
  'approaches',
  'dayLandings',
  'nightLandings',
  'pic',
  'sic',
  'dualReceived',
  'dualGiven',
  'crossCountry',
  'night',
  'actualInstrument',
  'simulatedInstrument',
  'total',
] as const

export type PaperNumericKey = (typeof PAPER_NUMERIC_KEYS)[number]

export interface PaperLogbookTotals {
  approaches: number
  dayLandings: number
  nightLandings: number
  pic: number
  sic: number
  dualReceived: number
  dualGiven: number
  crossCountry: number
  night: number
  actualInstrument: number
  simulatedInstrument: number
  total: number
}

export interface PaperLogbookRow {
  id: string
  date: string
  aircraftType: string
  ident: string
  from: string
  to: string
  routeRemarks: string
  categoryClass: string
  approaches: number
  dayLandings: number
  nightLandings: number
  pic: number
  sic: number
  dualReceived: number
  dualGiven: number
  crossCountry: number
  night: number
  actualInstrument: number
  simulatedInstrument: number
  total: number
}

export interface PaperLogbookPage {
  pageNumber: number
  pageCount: number
  amountForwarded: PaperLogbookTotals
  rows: PaperLogbookRow[]
  /** Always `rowsPerPage` long; unused slots are null (blank paper lines). */
  slots: Array<PaperLogbookRow | null>
  pageTotals: PaperLogbookTotals
  totalsToDate: PaperLogbookTotals
}

export interface PaperLogbookDocument {
  pilotName: string
  certificateNumber: string
  dateStart: string | null
  dateEnd: string | null
  rowsPerPage: number
  includedCount: number
  excludedVoidOrSuperseded: number
  forwardedFromPrior: number
  pages: PaperLogbookPage[]
}

export interface PaginatePaperLogbookOptions {
  pilotName?: string
  certificateNumber?: string
  dateStart?: string | null
  dateEnd?: string | null
  rowsPerPage?: number
}

export function clampRowsPerPage(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return DEFAULT_ROWS_PER_PAGE
  return Math.min(MAX_ROWS_PER_PAGE, Math.max(MIN_ROWS_PER_PAGE, Math.round(n)))
}

export function emptyPaperTotals(): PaperLogbookTotals {
  return {
    approaches: 0,
    dayLandings: 0,
    nightLandings: 0,
    pic: 0,
    sic: 0,
    dualReceived: 0,
    dualGiven: 0,
    crossCountry: 0,
    night: 0,
    actualInstrument: 0,
    simulatedInstrument: 0,
    total: 0,
  }
}

function roundHours(value: number): number {
  return roundTenths(value)
}

export function addPaperTotals(
  a: PaperLogbookTotals,
  b: PaperLogbookTotals
): PaperLogbookTotals {
  return {
    approaches: a.approaches + b.approaches,
    dayLandings: a.dayLandings + b.dayLandings,
    nightLandings: a.nightLandings + b.nightLandings,
    pic: roundHours(a.pic + b.pic),
    sic: roundHours(a.sic + b.sic),
    dualReceived: roundHours(a.dualReceived + b.dualReceived),
    dualGiven: roundHours(a.dualGiven + b.dualGiven),
    crossCountry: roundHours(a.crossCountry + b.crossCountry),
    night: roundHours(a.night + b.night),
    actualInstrument: roundHours(a.actualInstrument + b.actualInstrument),
    simulatedInstrument: roundHours(a.simulatedInstrument + b.simulatedInstrument),
    total: roundHours(a.total + b.total),
  }
}

export function totalsFromPaperRow(row: PaperLogbookRow): PaperLogbookTotals {
  return {
    approaches: row.approaches,
    dayLandings: row.dayLandings,
    nightLandings: row.nightLandings,
    pic: row.pic,
    sic: row.sic,
    dualReceived: row.dualReceived,
    dualGiven: row.dualGiven,
    crossCountry: row.crossCountry,
    night: row.night,
    actualInstrument: row.actualInstrument,
    simulatedInstrument: row.simulatedInstrument,
    total: row.total,
  }
}

export function sumPaperRows(rows: readonly PaperLogbookRow[]): PaperLogbookTotals {
  return rows.reduce(
    (sum, row) => addPaperTotals(sum, totalsFromPaperRow(row)),
    emptyPaperTotals()
  )
}

export function entryToPaperRow(entry: LogEntry): PaperLogbookRow {
  const route = (entry.route || '').trim()
  const remarks = (entry.remarks || '').trim()
  const routeRemarks = [route, remarks].filter(Boolean).join(' · ')
  return {
    id: entry.id,
    date: formatDisplayDate(entry.date),
    aircraftType: (entry.aircraftMakeModel || '').trim(),
    ident: (entry.registration || '').trim(),
    from: formatEntryAirportCode(entry, entry.departure),
    to: formatEntryAirportCode(entry, entry.destination),
    routeRemarks,
    categoryClass: (entry.aircraftCategoryClass || '').trim(),
    approaches: getTotalApproachCount(entry.performance),
    dayLandings: entry.performance?.dayLandings ?? 0,
    nightLandings: entry.performance?.nightLandings ?? 0,
    pic: entry.flightTime.pic ?? 0,
    sic: entry.flightTime.sic ?? 0,
    dualReceived: entry.flightTime.dual ?? 0,
    dualGiven: entry.flightTime.dualGiven ?? 0,
    crossCountry: entry.flightTime.crossCountry ?? 0,
    night: entry.flightTime.night ?? 0,
    actualInstrument: entry.flightTime.actualInstrument ?? 0,
    simulatedInstrument: entry.flightTime.simulatedInstrument ?? 0,
    total: entry.flightTime.total ?? 0,
  }
}

export function formatPaperHours(
  value: number,
  options?: { emptyWhenZero?: boolean }
): string {
  return formatDecimalHours(value, {
    emptyWhenZero: options?.emptyWhenZero ?? false,
    emptyWhenNull: false,
  })
}

export function formatPaperCount(
  value: number,
  options?: { emptyWhenZero?: boolean }
): string {
  if (options?.emptyWhenZero && value === 0) return ''
  return String(value)
}

function normalizeBound(raw: string | null | undefined): string | null {
  const trimmed = (raw || '').trim()
  if (!trimmed) return null
  return normalizeCalendarYmd(trimmed)
}

export function entryInYmdRange(
  entry: Pick<LogEntry, 'date'>,
  start: string | null,
  end: string | null
): boolean {
  const ymd = normalizeCalendarYmd(entry.date)
  if (!ymd) return false
  if (start && ymd < start) return false
  if (end && ymd > end) return false
  return true
}

/** Same exclusion as dashboard totals / totals report: drop void amendments and superseded originals. */
export function filterEntriesForPaperLogbook(entries: readonly LogEntry[]): LogEntry[] {
  return filterEntriesForTotalsReport(entries)
}

function sortOldestFirst(entries: readonly LogEntry[]): LogEntry[] {
  return sortEntriesByDateAndOOOI(entries).slice().reverse()
}

function resolveRowsPerPage(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 1) return DEFAULT_ROWS_PER_PAGE
  return Math.min(50, Math.round(n))
}

export function paginatePaperLogbook(
  entries: readonly LogEntry[],
  options: PaginatePaperLogbookOptions = {}
): PaperLogbookDocument {
  const rowsPerPage = resolveRowsPerPage(options.rowsPerPage)
  const dateStart = normalizeBound(options.dateStart)
  const dateEnd = normalizeBound(options.dateEnd)
  const usable = filterEntriesForPaperLogbook(entries)
  const excludedVoidOrSuperseded = entries.length - usable.length
  const chronological = sortOldestFirst(usable)

  const prior = dateStart
    ? chronological.filter((entry) => {
        const ymd = normalizeCalendarYmd(entry.date)
        return ymd != null && ymd < dateStart
      })
    : []
  const inRange = chronological.filter((entry) => entryInYmdRange(entry, dateStart, dateEnd))

  const amountForwarded = sumPaperRows(prior.map(entryToPaperRow))
  const rows = inRange.map(entryToPaperRow)
  const pageCount = Math.max(1, Math.ceil(rows.length / rowsPerPage) || 1)
  const pages: PaperLogbookPage[] = []

  if (rows.length === 0) {
    return {
      pilotName: (options.pilotName || '').trim(),
      certificateNumber: (options.certificateNumber || '').trim(),
      dateStart,
      dateEnd,
      rowsPerPage,
      includedCount: 0,
      excludedVoidOrSuperseded,
      forwardedFromPrior: prior.length,
      pages: [],
    }
  }

  let running = { ...amountForwarded }
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const slice = rows.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage)
    const pageTotals = sumPaperRows(slice)
    const forwarded = { ...running }
    running = addPaperTotals(running, pageTotals)
    const slots: Array<PaperLogbookRow | null> = [...slice]
    while (slots.length < rowsPerPage) slots.push(null)
    pages.push({
      pageNumber: pageIndex + 1,
      pageCount,
      amountForwarded: forwarded,
      rows: slice,
      slots,
      pageTotals,
      totalsToDate: { ...running },
    })
  }

  return {
    pilotName: (options.pilotName || '').trim(),
    certificateNumber: (options.certificateNumber || '').trim(),
    dateStart,
    dateEnd,
    rowsPerPage,
    includedCount: rows.length,
    excludedVoidOrSuperseded,
    forwardedFromPrior: prior.length,
    pages,
  }
}
