import { getEndorsementTemplate } from './endorsementCatalog'

/** Template codes that authorize solo flight with a calendar expiry (AC 61-65K student solo). */
export const SOLO_FLIGHT_ENDORSEMENT_CODES = new Set(['A.5', 'A.6', 'A.7', 'A.61', 'A.65'])

export type SoloEndorsementPickInput = {
  status: string
  expires_at: string | null
  template_code: string | null
  title?: string | null
}

export type SoloEndorsementSummary = {
  title: string
  expiresAt: string
  daysRemaining: number
  expiringSoon: boolean
}

function parseExpiryMs(iso: string | null): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : null
}

export function pickActiveSoloEndorsement(
  rows: readonly SoloEndorsementPickInput[],
  referenceDate: Date = new Date()
): SoloEndorsementSummary | null {
  const refMs = referenceDate.getTime()
  const candidates: { row: SoloEndorsementPickInput; expiresMs: number }[] = []

  for (const row of rows) {
    if (row.status !== 'signed') continue
    const code = row.template_code?.trim()
    if (!code || !SOLO_FLIGHT_ENDORSEMENT_CODES.has(code)) continue
    const template = getEndorsementTemplate(code)
    if (template && !template.validityDays && code !== 'A.5') continue
    const expiresMs = parseExpiryMs(row.expires_at)
    if (expiresMs === null || expiresMs <= refMs) continue
    candidates.push({ row, expiresMs })
  }

  if (candidates.length === 0) return null

  candidates.sort((a, b) => a.expiresMs - b.expiresMs)
  const { row, expiresMs } = candidates[0]!
  const daysRemaining = Math.max(0, Math.ceil((expiresMs - refMs) / (24 * 60 * 60 * 1000)))
  const title =
    row.title?.trim() ||
    (row.template_code ? getEndorsementTemplate(row.template_code)?.title : undefined) ||
    'Solo endorsement'

  return {
    title,
    expiresAt: row.expires_at!,
    daysRemaining,
    expiringSoon: daysRemaining <= 30,
  }
}