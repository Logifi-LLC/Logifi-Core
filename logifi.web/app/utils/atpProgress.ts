import type { AirplaneTotals } from './totalsReport'
import {
  type AtpRequirementRow,
  type AtpTrackId,
  requirementsForAtpTrack,
} from './atpRequirements'

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

function hoursForRequirementKey(totals: AirplaneTotals, key: string): number {
  switch (key) {
    case 'total':
      return totals.total
    case 'pic':
      return totals.pic
    case 'crossCountry':
      return totals.crossCountry
    case 'night':
      return totals.night
    case 'instrument':
      return totals.actualInstrument + totals.simulatedInstrument
    case 'multiEngine':
      return totals.multiEngine
    default:
      return 0
  }
}

export function buildAtpProgress(
  airplaneTotals: AirplaneTotals,
  track: AtpTrackId
): AtpProgressSnapshot {
  const requirements = requirementsForAtpTrack(track)
  const rows: AtpProgressRow[] = requirements.map((req: AtpRequirementRow) => ({
    key: req.key,
    label: req.label,
    requiredHours: req.requiredHours,
    actualHours: roundTenth(hoursForRequirementKey(airplaneTotals, req.key)),
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