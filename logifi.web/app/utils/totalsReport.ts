import { catalogAircraftFamilyKey } from '../../shared/catalogAircraftFamily'
import {
  buildCsvContent,
  formatDecimalHours,
  formatWholeNumber,
} from '../../shared/logbookDataBridge/formatters'
import { localCalendarYmd, normalizeCalendarYmd } from '../../shared/localCalendarDate'
import { mapCategoryTo8710, type AircraftCategory8710 } from './form8710Types'
import { inferLogbookType } from './importSimulator'
import { buildSupersededIdSet } from './logEntryAmendments'
import {
  getTotalApproachCount,
  type LogEntry,
} from './logbookTypes'

/**
 * AirlineApps-style flight-time totals.
 *
 * Airplane columns never include FFS/FTD/ATD. Simulator hours stay in the
 * sim section. Turbine is omitted: log entries have no structured engine type
 * (do not infer turbine from make/model free text).
 */

export type TotalsReportWindow =
  | 'last30'
  | 'last90'
  | 'last365'
  | 'last12CalendarMonths'
  | 'all'

export const TOTALS_REPORT_WINDOWS: { id: TotalsReportWindow; label: string }[] = [
  { id: 'last30', label: 'Last 30 days' },
  { id: 'last90', label: 'Last 90 days' },
  { id: 'last365', label: 'Last 365 days' },
  { id: 'last12CalendarMonths', label: 'Last 12 calendar months' },
  { id: 'all', label: 'All time' },
]

export interface AirplaneTotals {
  total: number
  pic: number
  sic: number
  crossCountry: number
  night: number
  actualInstrument: number
  simulatedInstrument: number
  dualReceived: number
  dualGiven: number
  multiEngine: number
  approaches: number
  dayLandings: number
  nightLandings: number
}

export interface SimTotals {
  ffs: number
  ftd: number
  atd: number
  unspecified: number
}

export interface TotalsReportRow {
  key: string
  label: string
  airplane: AirplaneTotals
  sim: SimTotals
  entryCount: number
}

export interface TotalsReport {
  asOf: string
  window: TotalsReportWindow
  windowStart: string | null
  windowEnd: string
  includedCount: number
  excludedVoidOrSuperseded: number
  excludedOutsideWindow: number
  grandTotal: TotalsReportRow
  byCategoryClass: TotalsReportRow[]
  byAircraftType: TotalsReportRow[]
  bySimulator: TotalsReportRow[]
}

const EMPTY_AIRPLANE: AirplaneTotals = {
  total: 0,
  pic: 0,
  sic: 0,
  crossCountry: 0,
  night: 0,
  actualInstrument: 0,
  simulatedInstrument: 0,
  dualReceived: 0,
  dualGiven: 0,
  multiEngine: 0,
  approaches: 0,
  dayLandings: 0,
  nightLandings: 0,
}

const EMPTY_SIM: SimTotals = {
  ffs: 0,
  ftd: 0,
  atd: 0,
  unspecified: 0,
}

const CATEGORY_LABELS: Record<AircraftCategory8710, string> = {
  'airplane-sel': 'Airplane SEL',
  'airplane-mel': 'Airplane MEL',
  'airplane-ses': 'Airplane SES',
  'airplane-mes': 'Airplane MES',
  'rotorcraft-heli': 'Rotorcraft Helicopter',
  'rotorcraft-gyro': 'Rotorcraft Gyroplane',
  glider: 'Glider',
  'lta-balloon': 'LTA Balloon',
  'lta-airship': 'LTA Airship',
  'powered-lift': 'Powered Lift',
  ffs: 'Full Flight Simulator',
  ftd: 'Flight Training Device',
  atd: 'Aviation Training Device',
}

const CATEGORY_SORT: AircraftCategory8710[] = [
  'airplane-sel',
  'airplane-ses',
  'airplane-mel',
  'airplane-mes',
  'rotorcraft-heli',
  'rotorcraft-gyro',
  'glider',
  'lta-balloon',
  'lta-airship',
  'powered-lift',
]

const MULTI_ENGINE_CATEGORIES = new Set<AircraftCategory8710>([
  'airplane-mel',
  'airplane-mes',
])

export function roundTenths(value: number): number {
  return Math.round(value * 10) / 10
}

export function emptyAirplaneTotals(): AirplaneTotals {
  return { ...EMPTY_AIRPLANE }
}

export function emptySimTotals(): SimTotals {
  return { ...EMPTY_SIM }
}

export function simTotalHours(sim: SimTotals): number {
  return roundTenths(sim.ffs + sim.ftd + sim.atd + sim.unspecified)
}

/** Same exclusion as dashboard totals: drop superseded originals and void amendments. */
export function filterEntriesForTotalsReport(entries: readonly LogEntry[]): LogEntry[] {
  const superseded = buildSupersededIdSet(entries)
  return entries.filter((entry) => {
    if (entry.isVoid === true) return false
    if (superseded.has(entry.id)) return false
    return true
  })
}

export function addCalendarDays(ymd: string, delta: number): string {
  const [year, month, day] = splitYmd(ymd)
  const dt = new Date(Date.UTC(year, month - 1, day + delta))
  return formatUtcYmd(dt)
}

export function addCalendarMonths(ymd: string, delta: number): string {
  const [year, month, day] = splitYmd(ymd)
  const totalMonths = year * 12 + (month - 1) + delta
  const nextYear = Math.floor(totalMonths / 12)
  const nextMonth = (totalMonths % 12) + 1
  const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate()
  return `${nextYear}-${pad2(nextMonth)}-${pad2(Math.min(day, lastDay))}`
}

export function windowStartYmd(
  window: TotalsReportWindow,
  asOf: string
): string | null {
  if (window === 'all') return null
  if (window === 'last30') return addCalendarDays(asOf, -30)
  if (window === 'last90') return addCalendarDays(asOf, -90)
  if (window === 'last365') return addCalendarDays(asOf, -365)
  return addCalendarMonths(asOf, -12)
}

export function entryInCalendarWindow(
  entryDate: string,
  startYmd: string | null,
  endYmd: string
): boolean {
  const ymd = normalizeCalendarYmd(entryDate)
  if (!ymd) return false
  if (startYmd && ymd < startYmd) return false
  if (ymd > endYmd) return false
  return true
}

export function calculateTotalsReport(
  entries: readonly LogEntry[],
  window: TotalsReportWindow,
  asOf: string = localCalendarYmd()
): TotalsReport {
  const windowEnd = asOf
  const windowStart = windowStartYmd(window, asOf)
  const eligible = filterEntriesForTotalsReport(entries)
  const excludedVoidOrSuperseded = entries.length - eligible.length

  const inWindow: LogEntry[] = []
  let excludedOutsideWindow = 0
  for (const entry of eligible) {
    if (window !== 'all' && !entryInCalendarWindow(entry.date, windowStart, windowEnd)) {
      excludedOutsideWindow++
      continue
    }
    inWindow.push(entry)
  }

  const grand = createAccumulator('grand', 'Grand total')
  const categoryMap = new Map<string, RowAccumulator>()
  const typeMap = new Map<string, RowAccumulator>()
  const simMap = new Map<string, RowAccumulator>()

  for (const entry of inWindow) {
    const split = splitEntryTimes(entry)
    addAirplane(grand.airplane, split.airplane)
    addSim(grand.sim, split.sim)
    grand.entryCount += 1

    if (hasAirplaneTime(split.airplane) || hasAirplaneCounts(split.airplane)) {
      const category = airplaneCategoryRow(entry, categoryMap)
      addAirplane(category.airplane, split.airplane)
      category.entryCount += 1
      const type = airplaneTypeRow(entry, typeMap)
      addAirplane(type.airplane, split.airplane)
      type.entryCount += 1
    }

    addSimDeviceRows(simMap, split.sim)
  }

  return {
    asOf,
    window,
    windowStart,
    windowEnd,
    includedCount: inWindow.length,
    excludedVoidOrSuperseded,
    excludedOutsideWindow,
    grandTotal: finalizeRow(grand),
    byCategoryClass: sortCategoryRows(Array.from(categoryMap.values()).map(finalizeRow)),
    byAircraftType: sortLabelRows(Array.from(typeMap.values()).map(finalizeRow)),
    bySimulator: sortSimRows(Array.from(simMap.values()).map(finalizeRow)),
  }
}

export const AIRPLANE_COLUMN_LABELS = [
  { key: 'total', label: 'Total' },
  { key: 'pic', label: 'PIC' },
  { key: 'sic', label: 'SIC' },
  { key: 'crossCountry', label: 'Cross-country' },
  { key: 'night', label: 'Night' },
  { key: 'actualInstrument', label: 'Actual instrument' },
  { key: 'simulatedInstrument', label: 'Simulated instrument' },
  { key: 'dualReceived', label: 'Dual received' },
  { key: 'dualGiven', label: 'Dual given' },
  { key: 'multiEngine', label: 'Multi-engine' },
  { key: 'approaches', label: 'Approaches' },
  { key: 'dayLandings', label: 'Day landings' },
  { key: 'nightLandings', label: 'Night landings' },
] as const

export const SIM_COLUMN_LABELS = [
  { key: 'ffs', label: 'FFS' },
  { key: 'ftd', label: 'FTD' },
  { key: 'atd', label: 'ATD' },
  { key: 'unspecified', label: 'Sim (unspecified)' },
] as const

export function formatTotalsHours(value: number): string {
  return formatDecimalHours(roundTenths(value))
}

export function formatTotalsCount(value: number): string {
  return formatWholeNumber(value)
}

export function airplaneFieldDisplay(
  row: AirplaneTotals,
  key: (typeof AIRPLANE_COLUMN_LABELS)[number]['key']
): string {
  if (key === 'approaches' || key === 'dayLandings' || key === 'nightLandings') {
    return formatTotalsCount(row[key])
  }
  return formatTotalsHours(row[key])
}

export function buildTotalsReportCsv(report: TotalsReport): string {
  const headers = [
    'Group',
    'Label',
    ...AIRPLANE_COLUMN_LABELS.map((column) => column.label),
    'FFS',
    'FTD',
    'ATD',
    'Sim (unspecified)',
    'Sim total',
  ]

  const rows: string[][] = []
  const pushRow = (group: string, row: TotalsReportRow) => {
    rows.push([
      group,
      row.label,
      ...AIRPLANE_COLUMN_LABELS.map((column) => airplaneFieldDisplay(row.airplane, column.key)),
      formatTotalsHours(row.sim.ffs),
      formatTotalsHours(row.sim.ftd),
      formatTotalsHours(row.sim.atd),
      formatTotalsHours(row.sim.unspecified),
      formatTotalsHours(simTotalHours(row.sim)),
    ])
  }

  pushRow('Grand total', report.grandTotal)
  for (const row of report.byCategoryClass) pushRow('Category/Class', row)
  for (const row of report.byAircraftType) pushRow('Aircraft type', row)
  for (const row of report.bySimulator) pushRow('Simulator', row)

  return buildCsvContent(headers, rows, { bom: true })
}

interface EntrySplit {
  airplane: AirplaneTotals
  sim: SimTotals
}

interface RowAccumulator {
  key: string
  label: string
  airplane: AirplaneTotals
  sim: SimTotals
  entryCount: number
}

function createAccumulator(key: string, label: string): RowAccumulator {
  return {
    key,
    label,
    airplane: emptyAirplaneTotals(),
    sim: emptySimTotals(),
    entryCount: 0,
  }
}

function splitEntryTimes(entry: LogEntry): EntrySplit {
  const ft = entry.flightTime ?? {}
  const ffs = num(ft.ffs)
  const ftd = num(ft.ftd)
  const atd = num(ft.atd)
  const deviceSim = ffs + ftd + atd
  const rawTotal = num(ft.total)
  const airplaneTotal = Math.max(0, rawTotal - deviceSim)
  const simOnly =
    inferLogbookType(entry) === 'simulator' || (deviceSim > 0 && airplaneTotal === 0)

  const sim: SimTotals = {
    ffs,
    ftd,
    atd,
    unspecified: 0,
  }

  if (simOnly && deviceSim === 0 && rawTotal > 0) {
    sim.unspecified = rawTotal
  }

  if (simOnly) {
    return { airplane: emptyAirplaneTotals(), sim }
  }

  const ratio = rawTotal > 0 ? airplaneTotal / rawTotal : 1
  const category = mapCategoryTo8710(entry.aircraftCategoryClass || '')
  const multi = category && MULTI_ENGINE_CATEGORIES.has(category) ? airplaneTotal : 0

  const airplane: AirplaneTotals = {
    total: airplaneTotal,
    pic: num(ft.pic) * ratio,
    sic: num(ft.sic) * ratio,
    crossCountry: num(ft.crossCountry) * ratio,
    night: num(ft.night) * ratio,
    actualInstrument: num(ft.actualInstrument) * ratio,
    simulatedInstrument: num(ft.simulatedInstrument) * ratio,
    dualReceived: num(ft.dual) * ratio,
    dualGiven: num(ft.dualGiven) * ratio,
    multiEngine: multi,
    approaches: getTotalApproachCount(entry.performance),
    dayLandings: num(entry.performance?.dayLandings),
    nightLandings: num(entry.performance?.nightLandings),
  }

  return { airplane, sim }
}

function addAirplane(target: AirplaneTotals, add: AirplaneTotals): void {
  target.total += add.total
  target.pic += add.pic
  target.sic += add.sic
  target.crossCountry += add.crossCountry
  target.night += add.night
  target.actualInstrument += add.actualInstrument
  target.simulatedInstrument += add.simulatedInstrument
  target.dualReceived += add.dualReceived
  target.dualGiven += add.dualGiven
  target.multiEngine += add.multiEngine
  target.approaches += add.approaches
  target.dayLandings += add.dayLandings
  target.nightLandings += add.nightLandings
}

function addSim(target: SimTotals, add: SimTotals): void {
  target.ffs += add.ffs
  target.ftd += add.ftd
  target.atd += add.atd
  target.unspecified += add.unspecified
}

function hasAirplaneTime(airplane: AirplaneTotals): boolean {
  return (
    airplane.total > 0 ||
    airplane.pic > 0 ||
    airplane.sic > 0 ||
    airplane.crossCountry > 0 ||
    airplane.night > 0 ||
    airplane.actualInstrument > 0 ||
    airplane.simulatedInstrument > 0 ||
    airplane.dualReceived > 0 ||
    airplane.dualGiven > 0
  )
}

function hasAirplaneCounts(airplane: AirplaneTotals): boolean {
  return airplane.approaches > 0 || airplane.dayLandings > 0 || airplane.nightLandings > 0
}

function hasSimTime(sim: SimTotals): boolean {
  return sim.ffs > 0 || sim.ftd > 0 || sim.atd > 0 || sim.unspecified > 0
}

function airplaneCategoryRow(
  entry: LogEntry,
  map: Map<string, RowAccumulator>
): RowAccumulator {
  const mapped = mapCategoryTo8710(entry.aircraftCategoryClass || '')
  const key = mapped && !isSimCategory(mapped)
    ? mapped
    : normalizeRawCategory(entry.aircraftCategoryClass)
  const label = mapped && !isSimCategory(mapped)
    ? CATEGORY_LABELS[mapped]
    : key === 'unspecified'
      ? 'Unspecified'
      : entry.aircraftCategoryClass.trim() || 'Unspecified'
  return getOrCreate(map, key, label)
}

function airplaneTypeRow(
  entry: LogEntry,
  map: Map<string, RowAccumulator>
): RowAccumulator {
  const label = catalogAircraftFamilyKey(entry.aircraftMakeModel, entry.registration) || 'Unknown'
  return getOrCreate(map, label.toLowerCase(), label)
}

function addSimDeviceRows(map: Map<string, RowAccumulator>, sim: SimTotals): void {
  if (sim.ffs > 0) {
    const row = getOrCreate(map, 'ffs', CATEGORY_LABELS.ffs)
    row.sim.ffs += sim.ffs
    row.entryCount += 1
  }
  if (sim.ftd > 0) {
    const row = getOrCreate(map, 'ftd', CATEGORY_LABELS.ftd)
    row.sim.ftd += sim.ftd
    row.entryCount += 1
  }
  if (sim.atd > 0) {
    const row = getOrCreate(map, 'atd', CATEGORY_LABELS.atd)
    row.sim.atd += sim.atd
    row.entryCount += 1
  }
  if (sim.unspecified > 0) {
    const row = getOrCreate(map, 'sim-unspecified', 'Sim (unspecified)')
    row.sim.unspecified += sim.unspecified
    row.entryCount += 1
  }
}

function getOrCreate(
  map: Map<string, RowAccumulator>,
  key: string,
  label: string
): RowAccumulator {
  const existing = map.get(key)
  if (existing) return existing
  const created = createAccumulator(key, label)
  map.set(key, created)
  return created
}

function finalizeRow(row: RowAccumulator): TotalsReportRow {
  return {
    key: row.key,
    label: row.label,
    airplane: roundAirplane(row.airplane),
    sim: roundSim(row.sim),
    entryCount: row.entryCount,
  }
}

function roundAirplane(value: AirplaneTotals): AirplaneTotals {
  return {
    total: roundTenths(value.total),
    pic: roundTenths(value.pic),
    sic: roundTenths(value.sic),
    crossCountry: roundTenths(value.crossCountry),
    night: roundTenths(value.night),
    actualInstrument: roundTenths(value.actualInstrument),
    simulatedInstrument: roundTenths(value.simulatedInstrument),
    dualReceived: roundTenths(value.dualReceived),
    dualGiven: roundTenths(value.dualGiven),
    multiEngine: roundTenths(value.multiEngine),
    approaches: Math.round(value.approaches),
    dayLandings: Math.round(value.dayLandings),
    nightLandings: Math.round(value.nightLandings),
  }
}

function roundSim(value: SimTotals): SimTotals {
  return {
    ffs: roundTenths(value.ffs),
    ftd: roundTenths(value.ftd),
    atd: roundTenths(value.atd),
    unspecified: roundTenths(value.unspecified),
  }
}

function sortCategoryRows(rows: TotalsReportRow[]): TotalsReportRow[] {
  const order = new Map(CATEGORY_SORT.map((key, index) => [key, index]))
  return rows
    .filter((row) => hasAirplaneTime(row.airplane) || hasAirplaneCounts(row.airplane))
    .sort((a, b) => {
      const ai = order.has(a.key as AircraftCategory8710)
        ? order.get(a.key as AircraftCategory8710)!
        : 100
      const bi = order.has(b.key as AircraftCategory8710)
        ? order.get(b.key as AircraftCategory8710)!
        : 100
      if (ai !== bi) return ai - bi
      return a.label.localeCompare(b.label)
    })
}

function sortLabelRows(rows: TotalsReportRow[]): TotalsReportRow[] {
  return rows
    .filter((row) => hasAirplaneTime(row.airplane) || hasAirplaneCounts(row.airplane))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function sortSimRows(rows: TotalsReportRow[]): TotalsReportRow[] {
  const order = ['ffs', 'ftd', 'atd', 'sim-unspecified']
  return rows
    .filter((row) => hasSimTime(row.sim))
    .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
}

function isSimCategory(category: AircraftCategory8710): boolean {
  return category === 'ffs' || category === 'ftd' || category === 'atd'
}

function normalizeRawCategory(value: string): string {
  const trimmed = value.trim()
  return trimmed ? trimmed.toUpperCase() : 'unspecified'
}

function num(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function splitYmd(ymd: string): [number, number, number] {
  const normalized = normalizeCalendarYmd(ymd) ?? ymd
  const [year, month, day] = normalized.split('-').map((part) => Number(part))
  return [year, month, day]
}

function formatUtcYmd(dt: Date): string {
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}
