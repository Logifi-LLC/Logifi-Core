import { describe, expect, it } from 'vitest'
import type { FcvMappedEntry } from '../fcvMap'
import {
  fcvMappedToMatchShape,
  logEntryRowToExistingForDedup,
  logEntryRowToMatchShape,
  partitionFcvPreviewDuplicates,
} from '../fcvPreviewDuplicates'

function existingRow(
  overrides: {
    id: string
    date: string
    registration?: string
    departure?: string
    destination?: string
    flight_time?: unknown
    oooi?: unknown
    is_imported?: boolean
    import_source?: string | null
    fcv_flight_id?: string | null
    flight_number?: string | null
  }
) {
  return logEntryRowToExistingForDedup({
    registration: 'N12345',
    departure: 'KSEA',
    destination: 'KPDX',
    flight_time: { total: 1 },
    oooi: { out: '1000' },
    ...overrides,
  })
}

function flight(
  overrides: Partial<FcvMappedEntry> & Pick<FcvMappedEntry, 'fcv_flight_id' | 'date'>
): FcvMappedEntry {
  return {
    fcv_flight_id: overrides.fcv_flight_id,
    date: overrides.date,
    role: 'PIC',
    aircraft_category_class: 'AMEL',
    aircraft_make_model: 'B737',
    registration: 'N12345',
    departure: 'KSEA',
    destination: 'KPDX',
    flight_time: { total: 1.0 },
    oooi: { out: '1000', off: '1010', on: '1100', in: '1110' },
    ...overrides,
  }
}

describe('partitionFcvPreviewDuplicates', () => {
  it('returns empty partition when nothing matches', () => {
    const flights = [flight({ fcv_flight_id: 'new-1', date: '2026-04-17' })]
    const existingShapes = [
      existingRow({
        id: 'ex-1',
        date: '2026-04-16',
        registration: 'N99999',
      }),
    ]
    const part = partitionFcvPreviewDuplicates(flights, existingShapes, new Set())
    expect(part.alreadyImportedIndices).toEqual([])
    expect(part.heuristicDuplicateIndices).toEqual([])
    expect(part.duplicateIndices).toEqual([])
  })

  it('classifies exact fcv_flight_id hits as already imported, not heuristic', () => {
    const flights = [
      flight({
        fcv_flight_id: 'fcv-existing',
        date: '2026-04-16',
        registration: 'N12345',
        departure: 'KSEA',
        destination: 'KPDX',
      }),
    ]
    const existingShapes = [
      existingRow({
        id: 'ex-2',
        date: '2026-04-16',
      }),
    ]
    const part = partitionFcvPreviewDuplicates(
      flights,
      existingShapes,
      new Set(['fcv-existing'])
    )
    expect(part.alreadyImportedIndices).toEqual([0])
    expect(part.heuristicDuplicateIndices).toEqual([])
    expect(part.alreadyImportedFcvFlightIds).toEqual(['fcv-existing'])
    expect(part.duplicateFcvFlightIds).toEqual([])
  })

  it('uses heuristic when shape matches but fcv id is not already stored', () => {
    const flights = [
      flight({
        fcv_flight_id: 'fcv-brand-new',
        date: '2026-04-16',
        registration: 'N12345',
        departure: 'KSEA',
        destination: 'KPDX',
        oooi: { out: '1000' },
      }),
    ]
    const existingShapes = [
      existingRow({
        id: 'ex-2',
        date: '2026-04-16',
      }),
    ]
    const part = partitionFcvPreviewDuplicates(flights, existingShapes, new Set())
    expect(part.alreadyImportedIndices).toEqual([])
    expect(part.heuristicDuplicateIndices).toEqual([0])
    expect(part.duplicateFcvFlightIds).toEqual(['fcv-brand-new'])
  })

  it('handles mixed new, already-imported, and heuristic rows', () => {
    const flights = [
      flight({ fcv_flight_id: 'a', date: '2026-04-17', departure: 'KSEA', destination: 'KLAX' }),
      flight({ fcv_flight_id: 'b', date: '2026-04-16', departure: 'KSEA', destination: 'KPDX' }),
      flight({ fcv_flight_id: 'c', date: '2026-04-16', departure: 'KSEA', destination: 'KPDX' }),
    ]
    const existingShapes = [
      existingRow({
        id: 'ex-2',
        date: '2026-04-16',
      }),
    ]
    const part = partitionFcvPreviewDuplicates(flights, existingShapes, new Set(['b']))
    expect(part.alreadyImportedIndices).toEqual([1])
    expect(part.heuristicDuplicateIndices).toEqual([2])
    expect(part.duplicateIndices).toEqual([1, 2])
  })

  it('detects heuristic match when manual OOOI uses HH:MM and FC View uses HHMM', () => {
    const flights = [
      flight({
        fcv_flight_id: 'fcv-1',
        date: '2026-04-16',
        oooi: { out: '1430' },
      }),
    ]
    const existingShapes = [
      existingRow({
        id: 'manual-1',
        date: '2026-04-16',
        oooi: { out: '14:30' },
        is_imported: false,
      }),
    ]
    const part = partitionFcvPreviewDuplicates(flights, existingShapes, new Set())
    expect(part.heuristicDuplicateIndices).toEqual([0])
    expect(part.heuristicMatches[0]?.existingEntryId).toBe('manual-1')
    expect(part.heuristicMatches[0]?.isImported).toBe(false)
  })

  it('matches empty-tail FLICA row to logbook entry with N-number on same date/route', () => {
    const flights = [
      flight({
        fcv_flight_id: 'FLICA_20260812_4442_LGA',
        date: '2026-08-12',
        registration: '',
        departure: 'LGA',
        destination: 'RIC',
        flight_number: '4442',
        oooi: { out: '1059' },
      }),
    ]
    const existingShapes = [
      existingRow({
        id: 'log-1',
        date: '2026-08-12',
        registration: 'N12345',
        departure: 'KLGA',
        destination: 'KRIC',
        flight_number: '4442',
        oooi: { out: '1059' },
      }),
    ]
    const part = partitionFcvPreviewDuplicates(flights, existingShapes, new Set())
    expect(part.alreadyImportedIndices).toEqual([])
    expect(part.heuristicDuplicateIndices).toEqual([0])
    expect(part.heuristicMatches[0]?.existingEntryId).toBe('log-1')
  })

  it('keeps opposite same-day turn distinct (LGA-RIC vs RIC-LGA)', () => {
    const flights = [
      flight({
        fcv_flight_id: 'FLICA_20260812_4442_RIC',
        date: '2026-08-12',
        registration: '',
        departure: 'RIC',
        destination: 'LGA',
        flight_number: '4442',
        oooi: { out: '1310' },
      }),
    ]
    const existingShapes = [
      existingRow({
        id: 'log-1',
        date: '2026-08-12',
        registration: 'N12345',
        departure: 'KLGA',
        destination: 'KRIC',
        flight_number: '4442',
        oooi: { out: '1059' },
      }),
    ]
    const part = partitionFcvPreviewDuplicates(flights, existingShapes, new Set())
    expect(part.heuristicDuplicateIndices).toEqual([])
  })

  it('matches enriched FLICA row to logbook even when tail and actual OOOI differ', () => {
    const flights = [
      flight({
        fcv_flight_id: 'FLICA_20260812_4442_LGA',
        date: '2026-08-12',
        registration: 'N421YX',
        departure: 'LGA',
        destination: 'RIC',
        flight_number: '4442',
        oooi: { out: '1103' },
      }),
    ]
    const existingShapes = [
      existingRow({
        id: 'log-1',
        date: '2026-08-12',
        registration: '',
        departure: 'KLGA',
        destination: 'KRIC',
        flight_number: '4442',
        oooi: { out: '1059' },
      }),
    ]
    const part = partitionFcvPreviewDuplicates(flights, existingShapes, new Set())
    expect(part.alreadyImportedIndices).toEqual([])
    expect(part.heuristicDuplicateIndices).toEqual([0])
    expect(part.heuristicMatches[0]?.existingEntryId).toBe('log-1')
  })

  it('matches enriched FLICA row when logbook has a different N-number', () => {
    const flights = [
      flight({
        fcv_flight_id: 'FLICA_20260812_4442_LGA',
        date: '2026-08-12',
        registration: 'N421YX',
        departure: 'LGA',
        destination: 'RIC',
        flight_number: 'YX4442',
        oooi: { out: '1103' },
      }),
    ]
    const existingShapes = [
      existingRow({
        id: 'log-fcv',
        date: '2026-08-12',
        registration: 'N999AA',
        departure: 'KLGA',
        destination: 'KRIC',
        flight_number: '4442',
        oooi: { out: '1059' },
      }),
    ]
    const part = partitionFcvPreviewDuplicates(flights, existingShapes, new Set())
    expect(part.heuristicDuplicateIndices).toEqual([0])
    expect(part.heuristicMatches[0]?.existingEntryId).toBe('log-fcv')
  })

  it('keeps same-day same-route legs distinct when flight numbers differ', () => {
    const flights = [
      flight({
        fcv_flight_id: 'FLICA_20260812_5770_LGA',
        date: '2026-08-12',
        registration: 'N421YX',
        departure: 'LGA',
        destination: 'RIC',
        flight_number: '5770',
        oooi: { out: '1103' },
      }),
    ]
    const existingShapes = [
      existingRow({
        id: 'log-1',
        date: '2026-08-12',
        registration: 'N421YX',
        departure: 'KLGA',
        destination: 'KRIC',
        flight_number: '4442',
        oooi: { out: '1059' },
      }),
    ]
    const part = partitionFcvPreviewDuplicates(flights, existingShapes, new Set())
    expect(part.heuristicDuplicateIndices).toEqual([])
  })
})

describe('fcvMappedToMatchShape', () => {
  it('maps oooi out and total from preview flight', () => {
    const f = flight({ fcv_flight_id: 'x', date: '2026-01-01' })
    expect(fcvMappedToMatchShape(f).oooiOut).toBe('1000')
    expect(fcvMappedToMatchShape(f).flightTimeTotal).toBe(1)
  })
})
