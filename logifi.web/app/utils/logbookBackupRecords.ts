import { asReadOnlyBackupSignature, type FlightSignatureDisplay } from './flightSignatureDisplay'

export type BackupEndorsementRecord = {
  id: string
  studentId: string | null
  instructorId: string | null
  templateCode: string
  title: string
  renderedBody: string
  status: string
  signedAt: string | null
  cfiNumber: string | null
  cfiExpiration: string | null
  instructorFullName: string | null
  isImported: boolean
  electronicallySigned: false
}

export type LogbookBackupExtras = {
  endorsements: BackupEndorsementRecord[]
  flightSignatures: FlightSignatureDisplay[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function asNullableString(value: unknown): string | null {
  const text = asString(value).trim()
  return text ? text : null
}

function asIsoDay(value: unknown): string {
  return asString(value).slice(0, 10)
}

export function sanitizeBackupEndorsement(raw: unknown): BackupEndorsementRecord | null {
  const row = asRecord(raw)
  if (!row) return null
  const id = asString(row.id || row.Id).trim()
  if (!id) return null
  return {
    id,
    studentId: asNullableString(row.studentId ?? row.student_id),
    instructorId: asNullableString(row.instructorId ?? row.instructor_id),
    templateCode: asString(row.templateCode ?? row.template_code),
    title: asString(row.title),
    renderedBody: asString(row.renderedBody ?? row.rendered_body),
    status: asString(row.status) || 'signed',
    signedAt: asNullableString(row.signedAt ?? row.signed_at),
    cfiNumber: asNullableString(row.cfiNumber ?? row.cfi_number),
    cfiExpiration: asIsoDay(row.cfiExpiration ?? row.cfi_expiration) || null,
    instructorFullName: asNullableString(row.instructorFullName ?? row.instructor_full_name),
    isImported: row.isImported === true || row.is_imported === true,
    electronicallySigned: false,
  }
}

export function sanitizeBackupFlightSignature(raw: unknown): FlightSignatureDisplay | null {
  const row = asRecord(raw)
  if (!row) return null
  const logEntryId = asString(row.logEntryId ?? row.log_entry_id).trim()
  if (!logEntryId) return null
  return asReadOnlyBackupSignature({
    logEntryId,
    signerName: asString(row.signerName ?? row.signer_name ?? row.guestName ?? row.guest_name),
    certificateNumber: asString(
      row.certificateNumber ??
        row.signer_certificate_number ??
        row.guestCertificateNumber ??
        row.guest_certificate_number
    ),
    certificateExpiration: asIsoDay(
      row.certificateExpiration ?? row.signer_certificate_expiration
    ),
    signedAt: asNullableString(row.signedAt ?? row.signed_at),
    drawnSignatureUrl: asNullableString(row.drawnSignatureUrl ?? row.drawn_signature_url),
    signMethod: asNullableString(row.signMethod ?? row.sign_method),
  })
}

export function parseLogbookBackupExtras(data: unknown): LogbookBackupExtras {
  const root = asRecord(data)
  const endorsementSource = Array.isArray(root?.endorsements)
    ? root.endorsements
    : Array.isArray(root?.Endorsements)
      ? root.Endorsements
      : []
  const signatureSource = Array.isArray(root?.flightSignatures)
    ? root.flightSignatures
    : Array.isArray(root?.flight_signatures)
      ? root.flight_signatures
      : []

  return {
    endorsements: endorsementSource
      .map(sanitizeBackupEndorsement)
      .filter((row): row is BackupEndorsementRecord => row !== null),
    flightSignatures: signatureSource
      .map(sanitizeBackupFlightSignature)
      .filter((row): row is FlightSignatureDisplay => row !== null),
  }
}

/** Restore copies are display-only: never re-sign or mark electronically signed. */
export function backupSignaturesAreReadOnly(rows: FlightSignatureDisplay[]): boolean {
  return rows.every((row) => row.electronicallySigned === false)
}

export function attachBackupSignaturesToEntries<T extends { id: string }>(
  entries: T[],
  signatures: FlightSignatureDisplay[]
): Array<T & { importedSignatureDisplay: FlightSignatureDisplay | null }> {
  const byEntry = new Map<string, FlightSignatureDisplay>()
  for (const signature of signatures) {
    if (!byEntry.has(signature.logEntryId)) {
      byEntry.set(signature.logEntryId, {
        ...signature,
        electronicallySigned: false,
      })
    }
  }
  return entries.map((entry) => ({
    ...entry,
    importedSignatureDisplay: byEntry.get(entry.id) ?? null,
  }))
}
