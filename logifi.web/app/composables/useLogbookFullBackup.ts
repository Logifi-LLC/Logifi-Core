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
import { supabase } from '~/lib/supabase'
import { sanitizeBackupEndorsement } from '~/utils/logbookBackupRecords'
import { flightSignatureFromRow, asReadOnlyBackupSignature } from '~/utils/flightSignatureDisplay'

export function useLogbookFullBackup() {
  const { prepareEntriesForExport } = useExport()

  async function fetchOwnerBackupExtras(entries: LogEntry[]) {
    const endorsements: ReturnType<typeof sanitizeBackupEndorsement>[] = []
    const flightSignatures: ReturnType<typeof asReadOnlyBackupSignature>[] = []

    const { data: endorsementRows, error: endorsementError } = await supabase
      .from('endorsements')
      .select(
        'id, student_id, instructor_id, template_code, title, rendered_body, status, signed_at, cfi_number, cfi_expiration, instructor_full_name, is_imported'
      )
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    if (endorsementError) {
      console.warn('[backup] endorsements fetch failed:', endorsementError.message)
    } else {
      for (const row of endorsementRows ?? []) {
        const sanitized = sanitizeBackupEndorsement(row)
        if (sanitized) endorsements.push(sanitized)
      }
    }

    const ids = entries.map((entry) => entry.id).filter(Boolean)
    const CHUNK = 100
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK)
      const { data: signatureRows, error: signatureError } = await supabase
        .from('flight_signatures')
        .select(
          'log_entry_id, signer_name, guest_name, signer_certificate_number, guest_certificate_number, signer_certificate_expiration, signed_at, drawn_signature_url, sign_method'
        )
        .in('log_entry_id', chunk)
      if (signatureError) {
        console.warn('[backup] flight_signatures fetch failed:', signatureError.message)
        break
      }
      for (const row of signatureRows ?? []) {
        flightSignatures.push(
          asReadOnlyBackupSignature(flightSignatureFromRow(row))
        )
      }
    }

    return {
      endorsements: endorsements.filter(
        (row): row is NonNullable<typeof row> => row !== null
      ),
      flightSignatures,
    }
  }

  async function prepareJsonString(
    entries: LogEntry[],
    pilotProfile: Record<string, unknown> | null,
    includeAuditTrail = true
  ): Promise<string> {
    const preparedEntries = await prepareEntriesForExport(entries, includeAuditTrail)
    const extras = await fetchOwnerBackupExtras(entries)
    return buildLogbookJsonBackupString({
      preparedEntries,
      pilotProfile,
      endorsements: extras.endorsements,
      flightSignatures: extras.flightSignatures,
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