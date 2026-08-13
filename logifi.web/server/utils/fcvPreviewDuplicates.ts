import type { FcvMappedEntry } from './fcvMap'
import { canonicalizeAirportCodeForMatch } from '../../shared/airportCodeCanonical'
import {
  entriesDuplicateMatch,
  normalizeOooiOutForMatch,
  type DuplicateEntryMatchShape,
} from '../../shared/duplicateEntryMatch'

export interface ExistingLogEntryForDedup {
  id: string
  shape: DuplicateEntryMatchShape
  isImported: boolean
  importSource: string | null
  fcvFlightId: string | null
}

export interface HeuristicMatchInfo {
  index: number
  fcvFlightId: string
  existingEntryId: string
  date: string
  registration: string
  departure: string
  destination: string
  flightTimeTotal: number | null
  isImported: boolean
  importSource: string | null
}

export function fcvMappedToMatchShape(f: FcvMappedEntry): DuplicateEntryMatchShape {
  const ft = f.flight_time as { total?: unknown } | undefined
  const total =
    typeof ft?.total === 'number' && Number.isFinite(ft.total) ? ft.total : null
  const oooi = f.oooi as { out?: unknown } | null
  const out =
    typeof oooi?.out === 'string' && oooi.out.trim() !== '' ? oooi.out : null
  const flightNumber =
    typeof f.flight_number === 'string' && f.flight_number.trim()
      ? f.flight_number.trim()
      : null

  return {
    date: f.date,
    registration: f.registration,
    departure: f.departure,
    destination: f.destination,
    oooiOut: out,
    flightTimeTotal: total,
    flightNumber,
  }
}

export function logEntryRowToMatchShape(row: {
  date: string
  registration: string
  departure: string
  destination: string
  flight_time: unknown
  oooi: unknown
  flight_number?: string | null
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
  const flightNumber =
    typeof row.flight_number === 'string' && row.flight_number.trim()
      ? row.flight_number.trim()
      : null

  return {
    date: row.date,
    registration: row.registration,
    departure: row.departure,
    destination: row.destination,
    oooiOut: out,
    flightTimeTotal: total,
    flightNumber,
  }
}

export function logEntryRowToExistingForDedup(row: {
  id: string
  date: string
  registration: string
  departure: string
  destination: string
  flight_time: unknown
  oooi: unknown
  is_imported?: boolean | null
  import_source?: string | null
  fcv_flight_id?: string | null
  flight_number?: string | null
}): ExistingLogEntryForDedup {
  return {
    id: row.id,
    shape: logEntryRowToMatchShape(row),
    isImported: row.is_imported === true,
    importSource: typeof row.import_source === 'string' ? row.import_source : null,
    fcvFlightId:
      typeof row.fcv_flight_id === 'string' && row.fcv_flight_id.trim()
        ? row.fcv_flight_id.trim()
        : null,
  }
}

function airportFieldForMatch(value: string | undefined): string {
  const raw = (value || 'UNKNOWN').trim().toUpperCase()
  if (raw === '' || raw === 'UNKNOWN') return raw
  return canonicalizeAirportCodeForMatch(raw)
}

function normalizeRegistrationForMatch(value: string | null | undefined): string {
  return (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function normalizeFlightNumberForMatch(value: string | null | undefined): string {
  return (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function flightNumbersCompatible(
  preview: string | null | undefined,
  existing: string | null | undefined
): boolean {
  const a = normalizeFlightNumberForMatch(preview)
  const b = normalizeFlightNumberForMatch(existing)
  if (!a || !b) return true
  if (a === b) return true
  const digitsA = a.replace(/^[A-Z]+/, '')
  const digitsB = b.replace(/^[A-Z]+/, '')
  return Boolean(digitsA && digitsB && /^\d+$/.test(digitsA) && digitsA === digitsB)
}

function oooiOutCompatible(
  preview: string | null | undefined,
  existing: string | null | undefined
): boolean {
  const a = preview?.trim()
  const b = existing?.trim()
  if (!a || !b) return true
  const an = normalizeOooiOutForMatch(a)
  const bn = normalizeOooiOutForMatch(b)
  if (an !== null && bn !== null) return an === bn
  return a === b
}

/**
 * FLICA preview rows often have no tail yet. Match date + route, plus flight number
 * and OOOI out when both sides have them. Existing N-number is ignored.
 */
function emptyTailScheduleLegMatch(
  preview: DuplicateEntryMatchShape,
  existing: DuplicateEntryMatchShape
): boolean {
  if (preview.date !== existing.date) return false
  if (
    airportFieldForMatch(preview.departure) !== airportFieldForMatch(existing.departure) ||
    airportFieldForMatch(preview.destination) !== airportFieldForMatch(existing.destination)
  ) {
    return false
  }
  if (!flightNumbersCompatible(preview.flightNumber, existing.flightNumber)) return false
  return oooiOutCompatible(preview.oooiOut, existing.oooiOut)
}

export function findHeuristicMatchForFcvFlight(
  f: FcvMappedEntry,
  existing: ExistingLogEntryForDedup[]
): ExistingLogEntryForDedup | null {
  const previewShape = fcvMappedToMatchShape(f)
  if (!normalizeRegistrationForMatch(previewShape.registration)) {
    return existing.find((ex) => emptyTailScheduleLegMatch(previewShape, ex.shape)) ?? null
  }
  return (
    existing.find((ex) => entriesDuplicateMatch(previewShape, ex.shape, 'importLeg')) ?? null
  )
}

export interface FcvPreviewDuplicatePartition {
  alreadyImportedIndices: number[]
  heuristicDuplicateIndices: number[]
  /** Union of the two index lists (sorted); same rows excluded from default import. */
  duplicateIndices: number[]
  duplicateFcvFlightIds: string[]
  alreadyImportedFcvFlightIds: string[]
  heuristicMatches: HeuristicMatchInfo[]
}

/**
 * Split FC View preview rows into exact-id matches (already in logbook) vs heuristic duplicates.
 * Heuristic matches are not reported for rows that are already exact-id imports.
 */
export function partitionFcvPreviewDuplicates(
  flights: FcvMappedEntry[],
  existing: ExistingLogEntryForDedup[],
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
  const heuristicMatches: HeuristicMatchInfo[] = []

  flights.forEach((f, index) => {
    if (alreadyImportedIndexSet.has(index)) return
    const hit = findHeuristicMatchForFcvFlight(f, existing)
    if (hit) {
      heuristicDuplicateIndices.push(index)
      const id = String(f.fcv_flight_id ?? '').trim()
      if (id) duplicateFcvFlightIds.push(id)
      heuristicMatches.push({
        index,
        fcvFlightId: id,
        existingEntryId: hit.id,
        date: hit.shape.date,
        registration: hit.shape.registration,
        departure: hit.shape.departure,
        destination: hit.shape.destination,
        flightTimeTotal: hit.shape.flightTimeTotal ?? null,
        isImported: hit.isImported,
        importSource: hit.importSource,
      })
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
    heuristicMatches,
  }
}
