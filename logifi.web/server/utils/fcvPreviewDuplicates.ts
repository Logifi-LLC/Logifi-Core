import type { FcvMappedEntry } from './fcvMap'
import {
  entriesDuplicateMatch,
  type DuplicateEntryMatchShape,
} from '../../shared/duplicateEntryMatch'

export function fcvMappedToMatchShape(f: FcvMappedEntry): DuplicateEntryMatchShape {
  const ft = f.flight_time as { total?: unknown } | undefined
  const total =
    typeof ft?.total === 'number' && Number.isFinite(ft.total) ? ft.total : null
  const oooi = f.oooi as { out?: unknown } | null
  const out =
    typeof oooi?.out === 'string' && oooi.out.trim() !== '' ? oooi.out : null

  return {
    date: f.date,
    registration: f.registration,
    departure: f.departure,
    destination: f.destination,
    oooiOut: out,
    flightTimeTotal: total,
  }
}

export function logEntryRowToMatchShape(row: {
  date: string
  registration: string
  departure: string
  destination: string
  flight_time: unknown
  oooi: unknown
}): DuplicateEntryMatchShape {
  const ft = row.flight_time as { total?: unknown } | null
  const raw = ft?.total
  const total =
    typeof raw === 'number' && Number.isFinite(raw)
      ? raw
      : typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))
        ? Number(raw)
        : null
  const oooi = row.oooi as { out?: unknown } | null
  const out =
    typeof oooi?.out === 'string' && oooi.out.trim() !== '' ? oooi.out : null

  return {
    date: row.date,
    registration: row.registration,
    departure: row.departure,
    destination: row.destination,
    oooiOut: out,
    flightTimeTotal: total,
  }
}

export interface FcvPreviewDuplicatePartition {
  alreadyImportedIndices: number[]
  heuristicDuplicateIndices: number[]
  /** Union of the two index lists (sorted); same rows excluded from default import. */
  duplicateIndices: number[]
  duplicateFcvFlightIds: string[]
  alreadyImportedFcvFlightIds: string[]
}

/**
 * Split FC View preview rows into exact-id matches (already in logbook) vs heuristic duplicates.
 * Heuristic matches are not reported for rows that are already exact-id imports.
 */
export function partitionFcvPreviewDuplicates(
  flights: FcvMappedEntry[],
  existingShapes: DuplicateEntryMatchShape[],
  existingFcvIds: Set<string>
): FcvPreviewDuplicatePartition {
  const alreadyImportedIndices: number[] = []
  const alreadyImportedFcvFlightIds: string[] = []

  flights.forEach((f, index) => {
    const id = String(f.fcv_flight_id ?? '').trim()
    if (id && existingFcvIds.has(id)) {
      alreadyImportedIndices.push(index)
      alreadyImportedFcvFlightIds.push(id)
    }
  })

  const alreadyImportedIndexSet = new Set(alreadyImportedIndices)

  const heuristicDuplicateIndices: number[] = []
  const duplicateFcvFlightIds: string[] = []

  flights.forEach((f, index) => {
    if (alreadyImportedIndexSet.has(index)) return
    const previewShape = fcvMappedToMatchShape(f)
    const hit = existingShapes.some((ex) =>
      entriesDuplicateMatch(previewShape, ex, 'importLeg')
    )
    if (hit) {
      heuristicDuplicateIndices.push(index)
      const id = String(f.fcv_flight_id ?? '').trim()
      if (id) duplicateFcvFlightIds.push(id)
    }
  })

  const duplicateIndices = [
    ...new Set([...alreadyImportedIndices, ...heuristicDuplicateIndices]),
  ].sort((a, b) => a - b)

  return {
    alreadyImportedIndices,
    heuristicDuplicateIndices,
    duplicateIndices,
    duplicateFcvFlightIds,
    alreadyImportedFcvFlightIds,
  }
}
