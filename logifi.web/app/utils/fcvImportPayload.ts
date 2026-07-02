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
