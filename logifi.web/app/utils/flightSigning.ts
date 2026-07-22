import type { LogEntry } from './logbookTypes'

export type SignatureRequirementEntry = Pick<LogEntry, 'flightTime'> & {
  isImported?: boolean | null
  isVoid?: boolean | null
}

/**
 * Dual Received time > 0 may receive an instructor signature.
 * Imported history (Digifi / CSV / paper) never requires Logifi electronic signing.
 * Void amendments never require signing.
 */
export function requiresInstructorSignature(
  entry: SignatureRequirementEntry | null | undefined
): boolean {
  if (!entry?.flightTime) return false
  if (entry.isImported === true) return false
  if (entry.isVoid === true) return false
  const dual = Number(entry.flightTime.dual ?? 0)
  return Number.isFinite(dual) && dual > 0
}
