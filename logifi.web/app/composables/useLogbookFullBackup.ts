import type { LogEntry } from '~/utils/logbookTypes'
import {
  buildFullBackupZipFilename,
  buildLogbookJsonBackupFilename,
  buildLogbookJsonBackupString,
} from '~/utils/logbookJsonBackup'
import { buildFullBackupZip } from '~/utils/fullBackupZip'
import type { FullBackupProgress } from '~/utils/fullBackupTypes'
import { saveBackupDownload } from '~/utils/saveBackupDownload'
import { useExport } from '~/composables/useExport'

export function useLogbookFullBackup() {
  const { prepareEntriesForExport } = useExport()

  async function prepareJsonString(
    entries: LogEntry[],
    pilotProfile: Record<string, unknown> | null,
    includeAuditTrail = true
  ): Promise<string> {
    const preparedEntries = await prepareEntriesForExport(entries, includeAuditTrail)
    return buildLogbookJsonBackupString({
      preparedEntries,
      pilotProfile,
    })
  }

  async function downloadJsonBackup(args: {
    entries: LogEntry[]
    pilotProfile: Record<string, unknown> | null
    filenameSegment?: string
  }): Promise<void> {
    const baseDate = new Date().toISOString().split('T')[0] ?? ''
    const json = await prepareJsonString(args.entries, args.pilotProfile, true)
    const filename = buildLogbookJsonBackupFilename(baseDate, args.filenameSegment ?? '')
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
    await saveBackupDownload(blob, filename)
  }

  async function downloadFullBackupZip(args: {
    userId: string
    entries: LogEntry[]
    pilotProfile: Record<string, unknown> | null
    filenameSegment?: string
    onProgress?: (progress: FullBackupProgress) => void
  }): Promise<void> {
    const exportedAt = new Date().toISOString()
    const baseDate = exportedAt.split('T')[0] ?? ''
    const json = await prepareJsonString(args.entries, args.pilotProfile, true)

    const { zipBytes } = await buildFullBackupZip({
      userId: args.userId,
      logbookJson: json,
      entryCount: args.entries.length,
      exportedAt,
      onProgress: args.onProgress,
    })

    args.onProgress?.({ phase: 'saving', message: 'Saving ZIP…' })
    const filename = buildFullBackupZipFilename(baseDate, args.filenameSegment ?? '')
    const blob = new Blob([zipBytes], { type: 'application/zip' })
    await saveBackupDownload(blob, filename)
  }

  return {
    downloadJsonBackup,
    downloadFullBackupZip,
    prepareJsonString,
  }
}