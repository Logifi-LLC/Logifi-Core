import { formatEndorsementSignatureBlock } from './endorsementSignature'
import { formatFlightSignatureBlock, type FlightSignatureDisplay } from './flightSignatureDisplay'

export const CFI_RECORD_LOOKBACK_YEARS = 3

export type CfiIssuedEndorsement = {
  id: string
  signed_at?: string | null
  title?: string | null
  template_code?: string | null
  student_id?: string | null
  instructor_full_name?: string | null
  cfi_number?: string | null
  cfi_expiration?: string | null
  status?: string | null
  is_imported?: boolean | null
}

export function cfiRecordCutoffIso(now = new Date()): string {
  const cutoff = new Date(now)
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - CFI_RECORD_LOOKBACK_YEARS)
  return cutoff.toISOString()
}

export function isWithinCfiLookback(
  signedAt: string | null | undefined,
  now = new Date()
): boolean {
  if (!signedAt) return false
  const ts = new Date(signedAt).getTime()
  if (Number.isNaN(ts)) return false
  return ts >= new Date(cfiRecordCutoffIso(now)).getTime()
}

function csvCell(value: string | null | undefined): string {
  const text = value ?? ''
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function buildCfiIssuedRecordsCsv(args: {
  endorsements: CfiIssuedEndorsement[]
  signatures: FlightSignatureDisplay[]
  now?: Date
}): string {
  const now = args.now ?? new Date()
  const lines = [
    ['kind', 'date', 'record', 'cfi_name', 'cfi_number', 'cfi_expiration', 'signature_block'].join(','),
  ]

  for (const row of args.endorsements) {
    if (!isWithinCfiLookback(row.signed_at, now)) continue
    lines.push(
      [
        csvCell('endorsement'),
        csvCell((row.signed_at || '').slice(0, 10)),
        csvCell(`${row.template_code || ''} ${row.title || ''}`.trim()),
        csvCell(row.instructor_full_name),
        csvCell(row.cfi_number),
        csvCell((row.cfi_expiration || '').slice(0, 10)),
        csvCell(formatEndorsementSignatureBlock(row)),
      ].join(',')
    )
  }

  for (const row of args.signatures) {
    if (!isWithinCfiLookback(row.signedAt, now)) continue
    lines.push(
      [
        csvCell('flight_signature'),
        csvCell((row.signedAt || '').slice(0, 10)),
        csvCell(row.logEntryId),
        csvCell(row.signerName),
        csvCell(row.certificateNumber),
        csvCell(row.certificateExpiration),
        csvCell(formatFlightSignatureBlock(row)),
      ].join(',')
    )
  }

  return `${lines.join('\n')}\n`
}

export function cfiIssuedRecordsFilename(kind: 'csv' | 'pdf', now = new Date()): string {
  const day = now.toISOString().slice(0, 10)
  return `logifi-cfi-records-${day}.${kind}`
}

export async function generateCfiIssuedRecordsPdf(args: {
  endorsements: CfiIssuedEndorsement[]
  signatures: FlightSignatureDisplay[]
  instructorName?: string
  now?: Date
}): Promise<Uint8Array> {
  const now = args.now ?? new Date()
  const pdfLib = await import('pdf-lib')
  const doc = await pdfLib.PDFDocument.create()
  const font = await doc.embedFont(pdfLib.StandardFonts.Helvetica)
  const bold = await doc.embedFont(pdfLib.StandardFonts.HelveticaBold)
  const black = pdfLib.rgb(0, 0, 0)

  const pageWidth = 612
  const pageHeight = 792
  const margin = 40
  let page = doc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  const ensureSpace = (need: number) => {
    if (y - need >= margin) return
    page = doc.addPage([pageWidth, pageHeight])
    y = pageHeight - margin
  }

  const write = (text: string, options?: { size?: number; bold?: boolean }) => {
    const size = options?.size ?? 10
    ensureSpace(size + 8)
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: options?.bold ? bold : font,
      color: black,
    })
    y -= size + 6
  }

  write('CFI records — last 3 years', { size: 14, bold: true })
  write(args.instructorName?.trim() || 'Instructor', { size: 10 })
  write(`14 CFR 61.189 · exported ${now.toISOString().slice(0, 10)}`, { size: 8 })
  y -= 8

  write('Endorsements issued', { size: 12, bold: true })
  const endorsements = args.endorsements.filter((row) => isWithinCfiLookback(row.signed_at, now))
  if (endorsements.length === 0) write('None')
  for (const row of endorsements) {
    write(`${(row.signed_at || '').slice(0, 10)}  ${row.template_code || ''}  ${row.title || ''}`, {
      size: 9,
    })
    write(formatEndorsementSignatureBlock(row), { size: 8 })
    y -= 4
  }

  y -= 8
  write('Flight signatures issued', { size: 12, bold: true })
  const signatures = args.signatures.filter((row) => isWithinCfiLookback(row.signedAt, now))
  if (signatures.length === 0) write('None')
  for (const row of signatures) {
    write(formatFlightSignatureBlock(row), { size: 9 })
    y -= 4
  }

  return doc.save()
}
