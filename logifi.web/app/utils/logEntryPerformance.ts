import {
  createEmptyPerformance,
  getApproachesFromPerformance,
  getTotalApproachCount,
  type PerformanceMetrics,
} from './logbookTypes'

/**
 * Count fields that must survive load and save. Dashboard `performanceFields`
 * is the landings/holds UI (and totals), so using that list to rebuild
 * performance dropped takeoffs.
 */
export const PERFORMANCE_COUNT_FIELDS = [
  'dayTakeoffs',
  'nightTakeoffs',
  'dayLandings',
  'nightLandings',
  'holdingProcedures',
] as const satisfies readonly (keyof PerformanceMetrics)[]

function coercePerformanceCount(
  value: number | string | null | undefined
): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(num) ? num : null
}

/** Copy takeoffs, landings, and holds onto dest (does not touch approaches). */
export function copyPerformanceCounts(
  source: PerformanceMetrics | null | undefined,
  dest: PerformanceMetrics
): void {
  for (const key of PERFORMANCE_COUNT_FIELDS) {
    dest[key] = coercePerformanceCount(source?.[key] as number | string | null | undefined)
  }
}

/** Display/load path: counts plus approaches. */
export function normalizePerformanceForDisplay(
  performance: PerformanceMetrics | null | undefined
): PerformanceMetrics {
  const dest = createEmptyPerformance()
  copyPerformanceCounts(performance, dest)
  dest.approaches = Array.isArray(performance?.approaches)
    ? [...performance.approaches]
    : getApproachesFromPerformance(performance)
  dest.approachCount = getTotalApproachCount(dest) || null
  dest.approachType = dest.approaches[0]?.type ?? null
  return dest
}
