import type { LogEntry } from '../app/utils/logbookTypes'

export interface LocalLogEntryWithSync {
  entry: LogEntry
  synced: boolean
}

export interface SyncQueueItemLike {
  operation: 'insert' | 'update' | 'delete'
  entryId: string
}

export function entryUpdatedAtMs(entry: LogEntry): number {
  if (!entry.updatedAt) return 0
  const ms = new Date(entry.updatedAt).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

/** True when the Supabase copy should win during merge. */
export function shouldPreferRemoteEntry(local: LogEntry | undefined, remote: LogEntry): boolean {
  if (!local) return true
  const localVer = local.version ?? 0
  const remoteVer = remote.version ?? 0
  if (remoteVer > localVer) return true
  if (localVer > remoteVer) return false
  return entryUpdatedAtMs(remote) >= entryUpdatedAtMs(local)
}

export interface MergeRemoteLogEntriesResult {
  mergedEntries: LogEntry[]
  removedEntryIds: string[]
}

/**
 * Merge local IndexedDB entries with a remote Supabase snapshot.
 * Removes synced locals missing from remote (remote delete). Unsynced locals are kept.
 */
export function mergeRemoteLogEntries(options: {
  localEntries: LocalLogEntryWithSync[]
  remoteEntries: LogEntry[]
  syncQueue: SyncQueueItemLike[]
}): MergeRemoteLogEntriesResult {
  const { localEntries, remoteEntries, syncQueue } = options
  const remoteIds = new Set(remoteEntries.map((entry) => entry.id))
  const pendingInsertIds = new Set(
    syncQueue.filter((item) => item.operation === 'insert').map((item) => item.entryId)
  )

  const entryMap = new Map<string, LogEntry>()
  const removedEntryIds: string[] = []

  for (const { entry, synced } of localEntries) {
    if (remoteIds.has(entry.id)) {
      const remote = remoteEntries.find((r) => r.id === entry.id)!
      entryMap.set(entry.id, shouldPreferRemoteEntry(entry, remote) ? remote : entry)
      continue
    }

    if (!synced) {
      entryMap.set(entry.id, entry)
      continue
    }

    if (pendingInsertIds.has(entry.id)) {
      entryMap.set(entry.id, entry)
      continue
    }

    removedEntryIds.push(entry.id)
  }

  for (const remoteEntry of remoteEntries) {
    if (!entryMap.has(remoteEntry.id)) {
      entryMap.set(remoteEntry.id, remoteEntry)
    }
  }

  return {
    mergedEntries: Array.from(entryMap.values()),
    removedEntryIds,
  }
}
