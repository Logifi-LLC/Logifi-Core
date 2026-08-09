import type { LogEntry } from '../app/utils/logbookTypes'
import type { SyncQueueItemLike } from './logEntryMerge'

/** Overlap window to tolerate clock skew between client and server. */
export const DELTA_OVERLAP_MS = 60_000

/** If a delta pull returns this many rows, fall back to a full reconcile. */
export const DELTA_FALLBACK_THRESHOLD = 2000

export interface LogEntryDeletionTombstone {
  entryId: string
  deletedAt: string
}

export interface DeltaSyncBatch {
  changedEntries: LogEntry[]
  tombstones: LogEntryDeletionTombstone[]
}

export function entryUpdatedAtIso(entry: LogEntry): string | null {
  if (!entry.updatedAt) return null
  const ms = new Date(entry.updatedAt).getTime()
  return Number.isNaN(ms) ? null : entry.updatedAt
}

/** Latest server updated_at from a batch of entries and tombstones. */
export function computeRemoteSyncWatermark(
  entries: LogEntry[],
  tombstones: LogEntryDeletionTombstone[] = []
): string | null {
  let maxMs = 0
  let maxIso: string | null = null

  for (const entry of entries) {
    const iso = entryUpdatedAtIso(entry)
    if (!iso) continue
    const ms = new Date(iso).getTime()
    if (!Number.isNaN(ms) && ms > maxMs) {
      maxMs = ms
      maxIso = iso
    }
  }

  for (const tombstone of tombstones) {
    const ms = new Date(tombstone.deletedAt).getTime()
    if (!Number.isNaN(ms) && ms > maxMs) {
      maxMs = ms
      maxIso = tombstone.deletedAt
    }
  }

  return maxIso
}

export function subtractOverlapFromIso(iso: string, overlapMs = DELTA_OVERLAP_MS): string {
  const ms = new Date(iso).getTime()
  if (Number.isNaN(ms)) return iso
  return new Date(Math.max(0, ms - overlapMs)).toISOString()
}

export function mergeWatermarks(current: string | null, incoming: string | null): string | null {
  if (!incoming) return current
  if (!current) return incoming
  return new Date(incoming).getTime() >= new Date(current).getTime() ? incoming : current
}

/**
 * Remove entries deleted on another device (tombstones).
 * Keeps locals with a pending insert in the sync queue.
 */
export function applyTombstoneDeletions(
  entries: LogEntry[],
  tombstoneEntryIds: string[],
  syncQueue: SyncQueueItemLike[]
): { mergedEntries: LogEntry[]; removedEntryIds: string[] } {
  if (tombstoneEntryIds.length === 0) {
    return { mergedEntries: entries, removedEntryIds: [] }
  }

  const tombstoneSet = new Set(tombstoneEntryIds)
  const pendingInsertIds = new Set(
    syncQueue.filter((item) => item.operation === 'insert').map((item) => item.entryId)
  )

  const removedEntryIds: string[] = []
  const mergedEntries = entries.filter((entry) => {
    if (!tombstoneSet.has(entry.id)) return true
    if (pendingInsertIds.has(entry.id)) return true
    removedEntryIds.push(entry.id)
    return false
  })

  return { mergedEntries, removedEntryIds }
}
