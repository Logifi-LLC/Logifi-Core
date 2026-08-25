export type FcvFlightAction = 'skip' | 'import' | 'link'

export interface FcvImportFlightRow<T = unknown> {
  flight: T
  index: number
}

export interface BuildFcvImportPayloadInput<T> {
  selectedWithIndex: FcvImportFlightRow<T>[]
  heuristicDuplicateIndices: Set<number>
  flightRowActions: Record<string, FcvFlightAction>
  buildFlight: (flight: T, index: number) => T
}

export interface FcvImportRequestPayload<T> {
  flights: T[]
  allowDuplicates: boolean
  flightActions?: Record<string, FcvFlightAction>
}

function fcvIdFromFlight(flight: unknown): string {
  if (!flight || typeof flight !== 'object') return ''
  const id = (flight as { fcv_flight_id?: unknown }).fcv_flight_id
  return typeof id === 'string' ? id.trim() : String(id ?? '').trim()
}

export interface AlreadyInLogbookDupHint {
  alreadyImportedFcvFlightIds?: string[]
  alreadyImportedIndices?: number[]
  heuristicDuplicateIndices?: number[]
  duplicateIndices?: number[]
}

/**
 * Drop preview rows that already exist in the logbook (exact id and/or heuristic match).
 */
export function omitAlreadyInLogbookPreviewFlights<T extends { fcv_flight_id?: unknown }>(
  flights: T[],
  dup: AlreadyInLogbookDupHint
): { flights: T[]; omitted: number } {
  const dropIdx = new Set<number>()
  const hasAlready = Array.isArray(dup.alreadyImportedIndices)
  const hasHeuristic = Array.isArray(dup.heuristicDuplicateIndices)
  if (hasAlready) {
    for (const i of dup.alreadyImportedIndices!) dropIdx.add(i)
  }
  if (hasHeuristic) {
    for (const i of dup.heuristicDuplicateIndices!) dropIdx.add(i)
  }
  if (!hasAlready && !hasHeuristic) {
    for (const i of dup.duplicateIndices ?? []) dropIdx.add(i)
  }
  const dropIds = new Set(
    (dup.alreadyImportedFcvFlightIds ?? [])
      .map((id) => String(id).trim())
      .filter((id) => id.length > 0)
  )
  const filtered = flights.filter((f, index) => {
    if (dropIdx.has(index)) return false
    const id = String(f.fcv_flight_id ?? '').trim()
    if (id && dropIds.has(id)) return false
    return true
  })
  return { flights: filtered, omitted: flights.length - filtered.length }
}

/** Default selection: clean flights only; heuristic dupes and already-imported rows unchecked. */
export function defaultSelectedFcvFlightIds(
  previewFlights: Array<{ fcv_flight_id?: unknown }>,
  heuristicDuplicateIndices: Set<number>,
  alreadyImportedIndices: Set<number>
): Set<string> {
  const out = new Set<string>()
  previewFlights.forEach((f, index) => {
    const id = String(f.fcv_flight_id ?? '').trim()
    if (!id) return
    if (heuristicDuplicateIndices.has(index)) return
    if (alreadyImportedIndices.has(index)) return
    out.add(id)
  })
  return out
}

/** Selected heuristic-duplicate rows must have an explicit link or import action. */
export function countUnresolvedDuplicateActions(
  selectedWithIndex: FcvImportFlightRow[],
  heuristicDuplicateIndices: Set<number>,
  flightRowActions: Record<string, FcvFlightAction>
): number {
  let count = 0
  for (const { flight, index } of selectedWithIndex) {
    if (!heuristicDuplicateIndices.has(index)) continue
    const fcvId = fcvIdFromFlight(flight)
    if (!fcvId) continue
    const action = flightRowActions[fcvId]
    if (action !== 'link' && action !== 'import') count++
  }
  return count
}

export function buildFcvImportRequestPayload<T>(
  input: BuildFcvImportPayloadInput<T>
): FcvImportRequestPayload<T> {
  const { selectedWithIndex, heuristicDuplicateIndices, flightRowActions, buildFlight } = input

  const flights = selectedWithIndex.map(({ flight, index }) => buildFlight(flight, index))

  const flightActionsPayload: Record<string, FcvFlightAction> = {}
  let allowDuplicates = false

  for (const { flight, index } of selectedWithIndex) {
    if (!heuristicDuplicateIndices.has(index)) continue
    const fcvId = fcvIdFromFlight(flight)
    if (!fcvId) continue
    const action = flightRowActions[fcvId]
    if (action === 'link' || action === 'import') {
      flightActionsPayload[fcvId] = action
      if (action === 'import') allowDuplicates = true
    }
  }

  const result: FcvImportRequestPayload<T> = {
    flights,
    allowDuplicates,
  }
  if (Object.keys(flightActionsPayload).length > 0) {
    result.flightActions = flightActionsPayload
  }
  return result
}
