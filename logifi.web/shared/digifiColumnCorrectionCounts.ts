/**
 * Aggregate Digifi Review edits vs AI-resolved values by field key only (no cell values).
 */

export interface DigifiColumnCorrectionRowInput {
  cells: Record<string, string>
  digifiCellMeta?: Record<
    string,
    {
      fieldKey?: string
      rawValue?: string
      resolvedValue?: string
    }
  >
}

export interface DigifiColumnCorrectionColumnInput {
  id: string
  fieldKey?: string
}

export function buildDigifiColumnCorrectionCounts(
  rows: DigifiColumnCorrectionRowInput[],
  columns: DigifiColumnCorrectionColumnInput[]
): Record<string, number> {
  const counts: Record<string, number> = {}

  for (const row of rows) {
    for (const column of columns) {
      const meta = row.digifiCellMeta?.[column.id]
      const fieldKey = meta?.fieldKey ?? column.fieldKey
      if (!meta || !fieldKey) continue

      const scanResolvedValue = (meta.resolvedValue ?? '').trim()
      const correctedValue = (row.cells?.[column.id] ?? '').trim()
      if (!scanResolvedValue || !correctedValue || correctedValue === scanResolvedValue) continue

      counts[fieldKey] = (counts[fieldKey] ?? 0) + 1
    }
  }

  return counts
}

const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/i

/** Reject unexpected keys or non-integer counts (import API hardening). */
export function sanitizeDigifiColumnCorrectionCounts(
  input: Record<string, unknown> | null | undefined
): Record<string, number> | null {
  if (!input || typeof input !== 'object') return null
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(input)) {
    if (!FIELD_KEY_PATTERN.test(key)) continue
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) continue
    if (n === 0) continue
    out[key] = n
  }
  return Object.keys(out).length > 0 ? out : null
}
