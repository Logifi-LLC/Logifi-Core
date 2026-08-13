import { describe, expect, it } from 'vitest'
import {
  buildFcvImportRequestPayload,
  countUnresolvedDuplicateActions,
  defaultSelectedFcvFlightIds,
  omitAlreadyInLogbookPreviewFlights,
} from '../../app/utils/fcvImportPayload'

function flight(id: string) {
  return { fcv_flight_id: id, date: '2026-01-01' }
}

describe('omitAlreadyInLogbookPreviewFlights', () => {
  it('omits exact-id and heuristic matches and reports count', () => {
    const preview = [flight('a'), flight('b'), flight('c'), flight('d')]
    const result = omitAlreadyInLogbookPreviewFlights(preview, {
      alreadyImportedIndices: [0],
      alreadyImportedFcvFlightIds: ['a'],
      heuristicDuplicateIndices: [2],
      duplicateIndices: [0, 2],
    })
    expect(result.omitted).toBe(2)
    expect(result.flights.map((f) => f.fcv_flight_id)).toEqual(['b', 'd'])
  })
})

describe('defaultSelectedFcvFlightIds', () => {
  it('selects clean flights only by default', () => {
    const preview = [flight('a'), flight('b'), flight('c'), flight('d')]
    const selected = defaultSelectedFcvFlightIds(
      preview,
      new Set([1]),
      new Set([2])
    )
    expect([...selected]).toEqual(['a', 'd'])
  })
})

describe('countUnresolvedDuplicateActions', () => {
  it('counts selected heuristic rows without link or import', () => {
    const selected = [
      { flight: flight('clean'), index: 0 },
      { flight: flight('dupe'), index: 1 },
    ]
    expect(
      countUnresolvedDuplicateActions(selected, new Set([1]), {})
    ).toBe(1)
    expect(
      countUnresolvedDuplicateActions(selected, new Set([1]), { dupe: 'link' })
    ).toBe(0)
  })
})

describe('buildFcvImportRequestPayload', () => {
  it('includes clean flights without flightActions', () => {
    const payload = buildFcvImportRequestPayload({
      selectedWithIndex: [
        { flight: flight('a'), index: 0 },
        { flight: flight('b'), index: 1 },
      ],
      heuristicDuplicateIndices: new Set(),
      flightRowActions: {},
      buildFlight: (f) => f,
    })
    expect(payload.flights).toHaveLength(2)
    expect(payload.flightActions).toBeUndefined()
    expect(payload.allowDuplicates).toBe(false)
  })

  it('sends link action only for selected heuristic duplicate', () => {
    const payload = buildFcvImportRequestPayload({
      selectedWithIndex: [
        { flight: flight('clean'), index: 0 },
        { flight: flight('dupe'), index: 1 },
      ],
      heuristicDuplicateIndices: new Set([1]),
      flightRowActions: { dupe: 'link' },
      buildFlight: (f) => f,
    })
    expect(payload.flights).toHaveLength(2)
    expect(payload.flightActions).toEqual({ dupe: 'link' })
    expect(payload.allowDuplicates).toBe(false)
  })

  it('sets allowDuplicates when heuristic row imports as separate entry', () => {
    const payload = buildFcvImportRequestPayload({
      selectedWithIndex: [{ flight: flight('dupe'), index: 0 }],
      heuristicDuplicateIndices: new Set([0]),
      flightRowActions: { dupe: 'import' },
      buildFlight: (f) => f,
    })
    expect(payload.allowDuplicates).toBe(true)
    expect(payload.flightActions).toEqual({ dupe: 'import' })
  })

  it('omits deselected rows from flights array', () => {
    const payload = buildFcvImportRequestPayload({
      selectedWithIndex: [{ flight: flight('a'), index: 0 }],
      heuristicDuplicateIndices: new Set(),
      flightRowActions: {},
      buildFlight: (f) => f,
    })
    expect(payload.flights.map((f) => f.fcv_flight_id)).toEqual(['a'])
  })
})
