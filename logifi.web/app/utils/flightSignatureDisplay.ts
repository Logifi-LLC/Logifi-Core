import { formatCfiExpirationForDisplay } from './cfiCertificateFields'

/** Display fields for a CFI signature block (live or backup). */
export type FlightSignatureDisplay = {
  logEntryId: string
  signerName: string
  certificateNumber: string
  certificateExpiration: string
  signedAt: string | null
  drawnSignatureUrl: string | null
  signMethod: string | null
  /** Live electronic signature vs restored backup display copy. */
  electronicallySigned: boolean
}

export function formatFlightSignatureBlock(row: FlightSignatureDisplay): string {
  const date = formatSignedAt(row.signedAt)
  const name = row.signerName.trim() || '(name not recorded)'
  const cert = row.certificateNumber.trim() || '—'
  const exp = formatCfiExpirationForDisplay(row.certificateExpiration)
  return `${date}  /s/ ${name}  ${cert}  Exp. ${exp}`
}

export function formatSignedAt(iso: string | null | undefined): string {
  if (!iso) return '—'
  const day = iso.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const [year, month, rest] = day.split('-')
    return `${month}/${rest}/${year}`
  }
  try {
    const parsed = new Date(iso)
    if (Number.isNaN(parsed.getTime())) return iso.slice(0, 10)
    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

/** True when a live signature row includes a stored drawn ink image path. */
export function entryHasDrawnInkSignature(row: {
  drawn_signature_url?: string | null
  sign_method?: string | null
} | null | undefined): boolean {
  const path = row?.drawn_signature_url?.trim()
  if (!path) return false
  const method = row?.sign_method
  if (!method || method === 'guest_drawn') return true
  return false
}

export function flightSignatureFromRow(row: {
  log_entry_id: string
  signer_name?: string | null
  guest_name?: string | null
  signer_certificate_number?: string | null
  guest_certificate_number?: string | null
  signer_certificate_expiration?: string | null
  signed_at?: string | null
  drawn_signature_url?: string | null
  sign_method?: string | null
}): FlightSignatureDisplay {
  return {
    logEntryId: row.log_entry_id,
    signerName: (row.signer_name || row.guest_name || '').trim(),
    certificateNumber: (row.signer_certificate_number || row.guest_certificate_number || '').trim(),
    certificateExpiration: (row.signer_certificate_expiration || '').slice(0, 10),
    signedAt: row.signed_at ?? null,
    drawnSignatureUrl: row.drawn_signature_url ?? null,
    signMethod: row.sign_method ?? null,
    electronicallySigned: true,
  }
}

/** Backup restore copies are display-only and never re-sign. */
export function asReadOnlyBackupSignature(
  row: Omit<FlightSignatureDisplay, 'electronicallySigned'>
): FlightSignatureDisplay {
  return {
    ...row,
    electronicallySigned: false,
  }
}
