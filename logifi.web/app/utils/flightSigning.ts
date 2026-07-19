import type { LogEntry } from './logbookTypes'

/** Dual Received time > 0 requires (or may receive) an instructor signature. */
export function requiresInstructorSignature(
  entry: Pick<LogEntry, 'flightTime'> | null | undefined
): boolean {
  if (!entry?.flightTime) return false
  const dual = Number(entry.flightTime.dual ?? 0)
  return Number.isFinite(dual) && dual > 0
}
