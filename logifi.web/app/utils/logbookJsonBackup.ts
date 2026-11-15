import type { LogEntry } from '~/utils/logbookTypes'

/** Canonical Logifi JSON backup schema version (unchanged for round-trip). */
export const LOGBOOK_JSON_BACKUP_VERSION = '1.1' as const

export interface LogbookJsonBackupPayload {
  exportedAt: string
  version: typeof LOGBOOK_JSON_BACKUP_VERSION
  pilotProfile: Record<string, unknown> | null
  entries: unknown[]
}

export function buildLogbookJsonBackupFilename(baseDate: string, filenameSegment = ''): string {
  return `logifi-logbook-${baseDate}${filenameSegment}.json`
}

export function buildFullBackupZipFilename(baseDate: string, filenameSegment = ''): string {
  return `logifi-full-backup-${baseDate}${filenameSegment}.zip`
}

export function buildLogbookJsonBackupPayload(args: {
  entries: unknown[]
  pilotProfile: Record<string, unknown> | null
  exportedAt?: string
}): LogbookJsonBackupPayload {
  return {
    exportedAt: args.exportedAt ?? new Date().toISOString(),
    version: LOGBOOK_JSON_BACKUP_VERSION,
    pilotProfile: args.pilotProfile,
    entries: args.entries,
  }
}

export function serializeLogbookJsonBackup(payload: LogbookJsonBackupPayload): string {
  return JSON.stringify(payload, null, 2)
}

/** Prepare JSON backup strings from log entries (caller supplies prepared export rows). */
export function buildLogbookJsonBackupString(args: {
  preparedEntries: unknown[]
  pilotProfile: Record<string, unknown> | null
  exportedAt?: string
}): string {
  const payload = buildLogbookJsonBackupPayload({
    entries: args.preparedEntries,
    pilotProfile: args.pilotProfile,
    exportedAt: args.exportedAt,
  })
  return serializeLogbookJsonBackup(payload)
}

export function entriesArrayFromJsonBackup(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray((data as LogbookJsonBackupPayload).entries)) {
    return (data as LogbookJsonBackupPayload).entries
  }
  return null
}

export function isNonEmptyLogEntryList(entries: LogEntry[] | undefined | null): boolean {
  return Array.isArray(entries) && entries.length > 0
}