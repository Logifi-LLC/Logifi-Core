import type { DigifiCorrectionFeedbackRow } from './digifiFeedback'

/** Top-N pairs injected into the scan prompt. Keep small so the model stays on the page image. */
export const DIGIFI_FEW_SHOT_LIMIT = 8
export const DIGIFI_FEW_SHOT_FETCH_LIMIT = 40
const MAX_EXAMPLE_CHARS = 40

export interface DigifiFewShotPair {
  fieldKey: string
  rawValue: string
  correctedValue: string
  sampleCount: number
  lastCorrectedAt: string | null
}

export function sanitizeFewShotValue(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/["`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_EXAMPLE_CHARS)
}

function toPair(row: Partial<DigifiCorrectionFeedbackRow> | DigifiFewShotPair): DigifiFewShotPair | null {
  const fieldKey =
    'fieldKey' in row && typeof row.fieldKey === 'string'
      ? row.fieldKey.trim()
      : typeof (row as DigifiCorrectionFeedbackRow).field_key === 'string'
        ? ((row as DigifiCorrectionFeedbackRow).field_key ?? '').trim()
        : ''
  const rawValue = sanitizeFewShotValue(
    'rawValue' in row && typeof row.rawValue === 'string'
      ? row.rawValue
      : (row as DigifiCorrectionFeedbackRow).raw_value
  )
  const correctedValue = sanitizeFewShotValue(
    'correctedValue' in row && typeof row.correctedValue === 'string'
      ? row.correctedValue
      : (row as DigifiCorrectionFeedbackRow).corrected_value
  )
  if (!fieldKey || !rawValue || !correctedValue) return null
  if (rawValue.toLowerCase() === correctedValue.toLowerCase()) return null

  const sampleCount =
    'sampleCount' in row && typeof row.sampleCount === 'number'
      ? row.sampleCount
      : (row as DigifiCorrectionFeedbackRow).sample_count ?? 1
  const lastCorrectedAt =
    'lastCorrectedAt' in row
      ? row.lastCorrectedAt ?? null
      : (row as DigifiCorrectionFeedbackRow).last_corrected_at ?? null

  return {
    fieldKey,
    rawValue,
    correctedValue,
    sampleCount: Number.isFinite(sampleCount) ? Math.max(1, sampleCount) : 1,
    lastCorrectedAt,
  }
}

function pairRank(a: DigifiFewShotPair, b: DigifiFewShotPair): number {
  if (b.sampleCount !== a.sampleCount) return b.sampleCount - a.sampleCount
  return (b.lastCorrectedAt ?? '').localeCompare(a.lastCorrectedAt ?? '')
}

function pairKey(pair: DigifiFewShotPair): string {
  return `${pair.fieldKey}|${pair.rawValue.toLowerCase()}|${pair.correctedValue.toLowerCase()}`
}

/**
 * Pick a diverse top-N set: one pair per field first (highest sample_count),
 * then fill remaining slots from leftover high-count pairs.
 */
export function selectTopFewShotPairs(
  rows: Array<Partial<DigifiCorrectionFeedbackRow> | DigifiFewShotPair>,
  limit = DIGIFI_FEW_SHOT_LIMIT
): DigifiFewShotPair[] {
  const pairs = rows
    .map(toPair)
    .filter((pair): pair is DigifiFewShotPair => pair != null)
    .sort(pairRank)

  const seen = new Set<string>()
  const unique: DigifiFewShotPair[] = []
  for (const pair of pairs) {
    const key = pairKey(pair)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(pair)
  }

  const selected: DigifiFewShotPair[] = []
  const usedFields = new Set<string>()
  for (const pair of unique) {
    if (selected.length >= limit) break
    if (usedFields.has(pair.fieldKey)) continue
    selected.push(pair)
    usedFields.add(pair.fieldKey)
  }
  for (const pair of unique) {
    if (selected.length >= limit) break
    if (selected.includes(pair)) continue
    selected.push(pair)
  }
  return selected
}

export function formatFewShotPromptBlock(pairs: DigifiFewShotPair[]): string {
  if (pairs.length === 0) return ''
  const lines = pairs.map(
    (pair) => `- ${pair.fieldKey}: "${pair.rawValue}" → "${pair.correctedValue}"`
  )
  return [
    'Pilot correction examples (apply similar mappings when handwriting is ambiguous; never invent values that are not on the page):',
    ...lines,
  ].join('\n')
}
