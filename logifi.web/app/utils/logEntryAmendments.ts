import type { LogEntry } from './logbookTypes'
import { createEmptyFlightTime, createEmptyPerformance } from './logbookTypes'

/** Entry that amends (supersedes) the given original id, if any. */
export function getAmendmentFor(
  entryId: string,
  entries: readonly LogEntry[]
): LogEntry | undefined {
  return entries.find((e) => e.amendsEntryId === entryId)
}

/**
 * Build a zero-time void amendment that supersedes a signed original.
 * Does not require instructor signature (dual = 0, isVoid = true).
 */
export function buildVoidAmendment(
  original: LogEntry,
  newId: string,
  reason: string
): LogEntry {
  const trimmedReason = reason.trim()
  const voidNote = trimmedReason
    ? `VOIDED: ${trimmedReason}`
    : 'VOIDED: Created in error'
  const priorRemarks = (original.remarks || '').trim()
  return {
    ...original,
    id: newId,
    amendsEntryId: original.id,
    isVoid: true,
    signaturePending: false,
    pendingInstructorId: null,
    dataHash: undefined,
    version: undefined,
    createdAt: undefined,
    updatedAt: undefined,
    flightTime: createEmptyFlightTime(),
    performance: createEmptyPerformance(),
    categoryClassTime: null,
    oooi: undefined,
    flagged: false,
    remarks: priorRemarks ? `${voidNote}\n\n${priorRemarks}` : voidNote,
    tags: Array.isArray(original.tags)
      ? Array.from(new Set([...original.tags, 'Void']))
      : ['Void'],
  }
}

/** IDs of originals that have been amended (superseded) by another entry. */
export function buildSupersededIdSet(
  entries: readonly LogEntry[]
): Set<string> {
  const superseded = new Set<string>()
  for (const entry of entries) {
    if (entry.amendsEntryId) {
      superseded.add(entry.amendsEntryId)
    }
  }
  return superseded
}

/** True when another entry in the logbook amends this one. */
export function isEntrySuperseded(
  entryId: string,
  entries: readonly LogEntry[]
): boolean {
  return entries.some((e) => e.amendsEntryId === entryId)
}

/** Original entry that this amendment replaces, if linked. */
export function getAmendedOriginal(
  entry: Pick<LogEntry, 'amendsEntryId'>,
  entries: readonly LogEntry[]
): LogEntry | undefined {
  if (!entry.amendsEntryId) return undefined
  return entries.find((e) => e.id === entry.amendsEntryId)
}

export function formatAmendsLabel(original: LogEntry): string {
  const date = (original.date || '').toString().slice(0, 10)
  const route = `${original.departure || '—'} → ${original.destination || '—'}`
  return date ? `${date} · ${route}` : route
}

/** An amendment repeats its original's date, tail and route by design; the pair is never a duplicate. */
export function isAmendmentPair(a: LogEntry, b: LogEntry): boolean {
  return (!!a.amendsEntryId && a.amendsEntryId === b.id) || (!!b.amendsEntryId && b.amendsEntryId === a.id)
}

/**
 * Prepare restored rows for insert. amends_entry_id is a foreign key, so a link to an original
 * that is neither in this batch nor already in the logbook is cleared, and originals are
 * ordered before the amendments that point at them. Mutates amendsEntryId on the given rows.
 */
export function prepareAmendmentLinksForInsert(
  entries: LogEntry[],
  existingIds: ReadonlySet<string>
): LogEntry[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]))
  for (const entry of entries) {
    if (entry.amendsEntryId && !byId.has(entry.amendsEntryId) && !existingIds.has(entry.amendsEntryId)) {
      entry.amendsEntryId = null
    }
  }

  const depthOf = (entry: LogEntry): number => {
    let depth = 0
    const seen = new Set<string>([entry.id])
    let current = entry
    while (current.amendsEntryId && byId.has(current.amendsEntryId) && !seen.has(current.amendsEntryId)) {
      current = byId.get(current.amendsEntryId)!
      seen.add(current.id)
      depth++
    }
    return depth
  }

  return entries
    .map((entry, index) => ({ entry, index, depth: depthOf(entry) }))
    .sort((a, b) => a.depth - b.depth || a.index - b.index)
    .map(({ entry }) => entry)
}
