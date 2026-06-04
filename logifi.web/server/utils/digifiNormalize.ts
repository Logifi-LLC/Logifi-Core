import type { DigifiTemplateColumn } from '../../app/utils/digifiTypes'
import { isDigifiManualOnlyField } from '../../app/utils/logbookBuilderTypes'
import { normalizeDigifiRegistrationKey } from '../../app/utils/digifiFeedback'
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

const AIRPORT_KEYS: Set<LogbookColumnKey> = new Set(['departure', 'destination', 'route'])

const AIRPORT_TOKEN_RE = /\b[A-Z0-9]{3,4}\b/g

/** Extract ICAO-like airport codes from free text (order preserved). */
export function splitAirportCodes(value: string): string[] {
  const matches = value.toUpperCase().match(AIRPORT_TOKEN_RE)
  return matches ?? []
}

function normalizeNumeric(val: string): string {
  const s = val.replace(/\$/g, '').replace(/,/g, '').trim()
  if (!s) return ''
  const n = parseFloat(s)
  if (!Number.isFinite(n) || n < 0) return s
  return String(Math.round(n * 10) / 10)
}

function normalizeAirport(val: string, fieldKey: LogbookColumnKey): string {
  const tokens = splitAirportCodes(val)
  if (tokens.length === 0) return val.trim()
  if (tokens.length === 1) return tokens[0]
  if (fieldKey === 'departure') return tokens[0]
  if (fieldKey === 'destination') return tokens[tokens.length - 1]
  if (fieldKey === 'route') return tokens.join(' ')
  return val.trim()
}

function reconcileRowAirports(
  cells: Record<string, string>,
  columns: DigifiTemplateColumn[]
): Record<string, string> {
  const departureCol = columns.find((c) => c.fieldKey === 'departure')
  const destinationCol = columns.find((c) => c.fieldKey === 'destination')
  const routeCol = columns.find((c) => c.fieldKey === 'route')
  if (!departureCol && !destinationCol) return cells

  const depTokens = departureCol ? splitAirportCodes(cells[departureCol.id] ?? '') : []
  const routeTokens = routeCol ? splitAirportCodes(cells[routeCol.id] ?? '') : []
  const destTokens = destinationCol ? splitAirportCodes(cells[destinationCol.id] ?? '') : []

  const needsFullReconcile =
    depTokens.length > 1 || routeTokens.length > 1 || destTokens.length > 1

  if (!needsFullReconcile) {
    if (
      routeCol &&
      departureCol &&
      destinationCol &&
      depTokens.length === 1 &&
      routeTokens.length === 1 &&
      destTokens.length === 1 &&
      depTokens[0] === routeTokens[0] &&
      destTokens[0] !== depTokens[0]
    ) {
      const next = { ...cells }
      next[departureCol.id] = depTokens[0]
      next[routeCol.id] = destTokens[0]
      next[destinationCol.id] = depTokens[0]
      return next
    }
    return cells
  }

  const orderedRaw: string[] = []
  if (departureCol) orderedRaw.push(cells[departureCol.id] ?? '')
  if (routeCol) orderedRaw.push(cells[routeCol.id] ?? '')
  if (destinationCol) orderedRaw.push(cells[destinationCol.id] ?? '')

  const tokens = orderedRaw.flatMap((raw) => splitAirportCodes(raw))
  if (tokens.length <= 1) {
    const next = { ...cells }
    const code = tokens[0]
    if (code) {
      if (departureCol) next[departureCol.id] = code
      if (destinationCol) next[destinationCol.id] = code
    }
    return next
  }

  const first = tokens[0]
  const last = tokens[tokens.length - 1]
  const middle = tokens.slice(1, -1)
  const next = { ...cells }
  if (departureCol) next[departureCol.id] = first
  if (destinationCol) next[destinationCol.id] = last
  if (routeCol) {
    next[routeCol.id] = middle.length > 0 ? middle.join(' ') : ''
  }
  return next
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
  if (fieldKey === 'identification') return normalizeDigifiRegistrationKey(v)
  if (fieldKey && AIRPORT_KEYS.has(fieldKey)) return normalizeAirport(v, fieldKey)
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
    const reconciledRaw = reconcileRowAirports(row.cells, columns)
    const cells: Record<string, string> = {}
    for (const [colId, raw] of Object.entries(reconciledRaw)) {
      const col = colById.get(colId)
      if (col && isDigifiManualOnlyField(col.fieldKey)) continue
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
