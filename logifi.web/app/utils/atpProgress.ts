import type { LogEntry } from './logbookTypes'
import { calculateTotalsReport, filterEntriesForTotalsReport } from './totalsReport'
import {
  type AtpRequirementRow,
  type AtpTrackId,
  requirementsForAtpTrack,
} from './atpRequirements'

export interface AtpHourAggregates {
  total: number
  crossCountry: number
  night: number
  multiEngine: number
  instrument: number
  pic: number
  /** Sum of min(PIC, XC) per entry where PIC is logged (61.159(a)(5) PIC XC). */
  picCrossCountry: number
  /** Sum of min(PIC, night) per entry where PIC is logged (61.159(a)(5) PIC night). */
  picNight: number
}

export interface AtpProgressRow {
  key: string
  label: string
  requiredHours: number
  actualHours: number
  regulation: string
}

export interface AtpProgressSnapshot {
  track: AtpTrackId
  rows: AtpProgressRow[]
}

export function computeAtpHourAggregates(entries: readonly LogEntry[]): AtpHourAggregates {
  const airplane = calculateTotalsReport(entries, 'all').grandTotal.airplane
  let picCrossCountry = 0
  let picNight = 0

  for (const entry of filterEntriesForTotalsReport(entries)) {
    const pic = entry.flightTime?.pic ?? 0
    if (pic <= 0) continue
    const xc = entry.flightTime?.crossCountry ?? 0
    if (xc > 0) picCrossCountry += Math.min(pic, xc)
    const night = entry.flightTime?.night ?? 0
    if (night > 0) picNight += Math.min(pic, night)
  }

  return {
    total: airplane.total,
    crossCountry: airplane.crossCountry,
    night: airplane.night,
    multiEngine: airplane.multiEngine,
    instrument: airplane.actualInstrument + airplane.simulatedInstrument,
    pic: airplane.pic,
    picCrossCountry: roundTenth(picCrossCountry),
    picNight: roundTenth(picNight),
  }
}

function hoursForRequirementKey(aggregates: AtpHourAggregates, key: string): number {
  switch (key) {
    case 'total':
      return aggregates.total
    case 'pic':
      return aggregates.pic
    case 'crossCountry':
      return aggregates.crossCountry
    case 'night':
      return aggregates.night
    case 'instrument':
      return aggregates.instrument
    case 'multiEngine':
      return aggregates.multiEngine
    case 'picCrossCountry':
      return aggregates.picCrossCountry
    case 'picNight':
      return aggregates.picNight
    default:
      return 0
  }
}

export function buildAtpProgress(
  aggregates: AtpHourAggregates,
  track: AtpTrackId
): AtpProgressSnapshot {
  const requirements = requirementsForAtpTrack(track)
  const rows: AtpProgressRow[] = requirements.map((req: AtpRequirementRow) => ({
    key: req.key,
    label: req.label,
    requiredHours: req.requiredHours,
    actualHours: roundTenth(hoursForRequirementKey(aggregates, req.key)),
    regulation: req.regulation,
  }))
  return { track, rows }
}

function roundTenth(n: number): number {
  return Math.round(n * 10) / 10
}

export function progressPercent(actual: number, required: number): number {
  if (required <= 0) return 0
  return Math.min(100, (actual / required) * 100)
}