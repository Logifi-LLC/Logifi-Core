import { describe, expect, it } from 'vitest'
import {
  copyPerformanceCounts,
  normalizePerformanceForDisplay,
} from '../logEntryPerformance'
import { createEmptyPerformance, type PerformanceMetrics } from '../logbookTypes'

/** Fictional performance — not from a real logbook. */
function savedPerformance(): PerformanceMetrics {
  return {
    dayTakeoffs: 1,
    nightTakeoffs: 2,
    dayLandings: 1,
    nightLandings: 2,
    approachCount: 1,
    approachType: 'ILS',
    approaches: [{ type: 'ILS', count: 1 }],
    holdingProcedures: 1,
  }
}

describe('normalizePerformanceForDisplay', () => {
  it('keeps day/night takeoffs on load (normalizeLogEntryForDisplay path)', () => {
    const normalized = normalizePerformanceForDisplay(savedPerformance())
    expect(normalized.dayTakeoffs).toBe(1)
    expect(normalized.nightTakeoffs).toBe(2)
    expect(normalized.dayLandings).toBe(1)
    expect(normalized.nightLandings).toBe(2)
    expect(normalized.holdingProcedures).toBe(1)
  })

  it('does not turn stored takeoffs into null when starting from an empty performance', () => {
    const dest = createEmptyPerformance()
    copyPerformanceCounts(savedPerformance(), dest)
    expect(dest.dayTakeoffs).toBe(1)
    expect(dest.nightTakeoffs).toBe(2)
    expect(dest.dayLandings).toBe(1)
    expect(dest.nightLandings).toBe(2)
  })
})

/** Same rebuild both dashboard save paths used: empty performance, then copy counts. */
function rebuildPerformanceForSave(source: PerformanceMetrics): PerformanceMetrics {
  const dest = { ...createEmptyPerformance() }
  copyPerformanceCounts(source, dest)
  return dest
}

describe('copyPerformanceCounts save paths', () => {
  it('keeps takeoffs on the inline-edit save rebuild', () => {
    const saved = rebuildPerformanceForSave(savedPerformance())
    expect(saved.dayTakeoffs).toBe(1)
    expect(saved.nightTakeoffs).toBe(2)
    expect(saved.dayLandings).toBe(1)
    expect(saved.holdingProcedures).toBe(1)
  })

  it('keeps takeoffs on the add-entry save rebuild', () => {
    const saved = rebuildPerformanceForSave({
      ...createEmptyPerformance(),
      dayTakeoffs: 3,
      nightTakeoffs: 1,
      dayLandings: 2,
    })
    expect(saved.dayTakeoffs).toBe(3)
    expect(saved.nightTakeoffs).toBe(1)
    expect(saved.dayLandings).toBe(2)
  })

  it('does not invent takeoffs when they were never logged', () => {
    const saved = rebuildPerformanceForSave({
      ...createEmptyPerformance(),
      dayLandings: 2,
    })
    expect(saved.dayTakeoffs).toBeNull()
    expect(saved.nightTakeoffs).toBeNull()
    expect(saved.dayLandings).toBe(2)
  })

  it('stores a cleared takeoff field as not logged, and an entered 0 as 0', () => {
    const saved = rebuildPerformanceForSave({
      ...createEmptyPerformance(),
      dayTakeoffs: '' as unknown as number,
      nightTakeoffs: 0,
      dayLandings: 2,
    })
    expect(saved.dayTakeoffs).toBeNull()
    expect(saved.nightTakeoffs).toBe(0)
  })
})

