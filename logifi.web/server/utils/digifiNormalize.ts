import type { DigifiTemplateColumn } from '../../app/utils/digifiTypes'
import type { LogbookColumnKey } from '../../app/utils/logbookTypes'

const NUMERIC_KEYS: Set<LogbookColumnKey> = new Set([
  'pic',
  'sic',
  'dualR',
  'solo',
  'night',
  'actual',
  'hood',
  'dualG',
  'xc',
  'dayLandings',
  'nightLandings',
  'approach',
  'total',
  'categoryClass',
])

const AIRPORT_KEYS: Set<LogbookColumnKey> = new Set(['departure', 'destination'])

function normalizeNumeric(val: string): string {
  const s = val.replace(/\$/g, '').replace(/,/g, '').trim()
  if (!s) return ''
  const n = parseFloat(s)
  if (!Number.isFinite(n) || n < 0) return s
  return String(Math.round(n * 10) / 10)
}

function normalizeAirport(val: string): string {
  const s = val.trim().toUpperCase()
  if (/^[A-Z0-9]{3,4}$/.test(s)) return s
  return val.trim()
}

function normalizeDate(val: string, defaultYear: number | null): string {
  const s = val.trim()
  if (!s) return ''
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) return s
  const year =
    typeof defaultYear === 'number' && Number.isFinite(defaultYear)
      ? defaultYear
      : new Date().getFullYear()
  const slashParts = s.split(/[/-]/).map((p) => p.trim())
  if (slashParts.length === 2) {
    const m = parseInt(slashParts[0], 10)
    const d = parseInt(slashParts[1], 10)
    if (Number.isFinite(m) && Number.isFinite(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }
  if (slashParts.length === 3) {
    const m = parseInt(slashParts[0], 10)
    const d = parseInt(slashParts[1], 10)
    const yRaw = slashParts[2]
    const parsedY = parseInt(yRaw, 10)
    if (Number.isFinite(m) && Number.isFinite(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      let y = year
      if (Number.isFinite(parsedY)) {
        if (yRaw.length === 2) {
          const century = Math.floor(year / 100) * 100
          y = century + parsedY
        } else if (parsedY >= 1000) {
          y = parsedY
        }
      }
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }
  return s
}

export function normalizeCellValue(
  value: string,
  fieldKey: LogbookColumnKey | null,
  defaultYear: number | null,
  categoryClassValue?: string
): string {
  let v = (value ?? '').trim().replace(/\s+/g, ' ')
  if (!v) return ''
  if (!fieldKey) return v
  if (fieldKey === 'date') return normalizeDate(v, defaultYear)
  if (AIRPORT_KEYS.has(fieldKey)) return normalizeAirport(v)
  if (NUMERIC_KEYS.has(fieldKey) || (fieldKey === 'categoryClass' && categoryClassValue)) {
    return normalizeNumeric(v)
  }
  return v
}

export function normalizeScanRows(
  rows: Array<{ rowIndex: number; cells: Record<string, string>; tags?: string[] }>,
  columns: DigifiTemplateColumn[],
  defaultYear: number | null
): Array<{ rowIndex: number; cells: Record<string, string>; tags?: string[] }> {
  const colById = new Map(columns.map((c) => [c.id, c]))
  return rows.map((row) => {
    const cells: Record<string, string> = {}
    for (const [colId, raw] of Object.entries(row.cells)) {
      const col = colById.get(colId)
      cells[colId] = normalizeCellValue(
        raw,
        col?.fieldKey ?? null,
        defaultYear,
        col?.categoryClassValue
      )
    }
    return {
      rowIndex: row.rowIndex,
      cells,
      tags: row.tags?.map((t) => t.trim()).filter(Boolean),
    }
  })
}
