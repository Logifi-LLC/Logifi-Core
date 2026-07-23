/** Fields needed for an AC 61-65H-style instructor signature block. */
export type EndorsementSignatureFields = {
  signed_at?: string | null
  instructor_full_name?: string | null
  cfi_number?: string | null
  cfi_expiration?: string | null
  status?: string | null
  is_imported?: boolean | null
}

function formatDisplayDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return String(iso).slice(0, 10)
  }
}

export function isPaperImportedEndorsement(
  row: Pick<EndorsementSignatureFields, 'status' | 'is_imported'>
): boolean {
  return row.is_imported === true || row.status === 'imported'
}

/**
 * Official signature line, e.g.
 * `07/23/2026  /s/ Jane Instructor  4170037CFI  Exp. 12/31/2027`
 * Paper imports use the same layout (paper date + typed CFI identity).
 */
export function formatEndorsementSignatureBlock(row: EndorsementSignatureFields): string {
  const date = formatDisplayDate(row.signed_at)
  const name = (row.instructor_full_name || '').trim()
  const namePart = name || '(name not recorded)'
  const cert = (row.cfi_number || '').trim()
  const certPart = cert ? `${cert}CFI` : 'CFI —'
  const expRaw = row.cfi_expiration
  const expPart = expRaw ? `Exp. ${formatDisplayDate(expRaw)}` : 'Exp. —'
  return `${date}  /s/ ${namePart}  ${certPart}  ${expPart}`
}
