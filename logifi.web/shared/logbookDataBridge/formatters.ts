import type { ExportDateFormat } from './types'

const AIRPORT_TOKEN_RE = /\b[A-Z0-9]{3,4}\b/g
const US_BARE_TAIL_RE = /^\d{1,5}[A-Z]{0,2}$/
const N_NUMBER_RE = /^N\d{1,5}[A-Z]{0,2}$/

export function splitAirportCodes(value: string): string[] {
  const matches = value.toUpperCase().match(AIRPORT_TOKEN_RE)
  return matches ?? []
}

export function normalizeRegistrationKey(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export interface RegistrationExportOptions {
  defaultCountry?: 'US'
}

export function formatRegistrationForExport(
  value: unknown,
  opts?: RegistrationExportOptions
): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim().toUpperCase()
  if (trimmed.startsWith('#')) {
    return trimmed.replace(/[^#A-Z0-9]/g, '')
  }

  const normalized = normalizeRegistrationKey(value)
  if (!normalized) return ''

  if (N_NUMBER_RE.test(normalized)) return normalized
  if (/^[A-Z]{1,2}\d/.test(normalized)) return normalized

  const country = opts?.defaultCountry ?? 'US'
  if (country === 'US' && US_BARE_TAIL_RE.test(normalized)) {
    return `N${normalized}`
  }

  return normalized
}

export function formatAirportCode(value: string | null | undefined): string {
  const raw = (value ?? '').trim().toUpperCase()
  if (!raw || raw === 'UNKNOWN') return ''
  return raw
}

export function buildFullRoute(
  departure: string,
  route: string,
  destination: string
): string {
  const parts: string[] = []
  const addTokens = (text: string) => {
    for (const token of splitAirportCodes(text)) {
      if (parts.length === 0 || parts[parts.length - 1] !== token) {
        parts.push(token)
      }
    }
  }
  addTokens(departure)
  addTokens(route)
  addTokens(destination)
  return parts.join(' ')
}

export function buildForeFlightRouteIntermediate(
  departure: string,
  route: string,
  destination: string
): string {
  const fullTokens = splitAirportCodes(buildFullRoute(departure, route, destination))
  if (fullTokens.length <= 2) {
    return splitAirportCodes(route).join(' ')
  }
  return fullTokens.slice(1, -1).join(' ')
}

/** Parse import date strings to ISO YYYY-MM-DD. */
export function parseImportDate(value: string): string | null {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const slashParts = trimmed.split('/')
  if (slashParts.length === 3 && slashParts[0] && slashParts[1] && slashParts[2]) {
    const p0 = slashParts[0]
    const p1 = slashParts[1]
    const p2 = slashParts[2]
    if (p2.length === 4) {
      return `${p2}-${p0.padStart(2, '0')}-${p1.padStart(2, '0')}`
    }
    if (p0.length === 4) {
      return `${p0}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`
    }
  }

  const d = new Date(trimmed)
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().split('T')[0] ?? null
  }

  return null
}

export function formatLogifiNativeDate(date: string): string {
  if (!date) return ''

  const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`
  }

  const mdyMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdyMatch?.[1] && mdyMatch[2] && mdyMatch[3]) {
    return `${mdyMatch[1].padStart(2, '0')}/${mdyMatch[2].padStart(2, '0')}/${mdyMatch[3]}`
  }

  const d = new Date(`${date}T00:00:00`)
  if (!Number.isNaN(d.getTime())) {
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${mm}/${dd}/${yyyy}`
  }

  return date
}

export function formatExportDate(isoDate: string, target: ExportDateFormat): string {
  const trimmed = (isoDate ?? '').trim()
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    const year = isoMatch[1]!
    const month = parseInt(isoMatch[2]!, 10)
    const day = parseInt(isoMatch[3]!, 10)
    if (target === 'mdy') return `${month}/${day}/${year}`
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const mdyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdyMatch) {
    const month = parseInt(mdyMatch[1]!, 10)
    const day = parseInt(mdyMatch[2]!, 10)
    const year = mdyMatch[3]!
    if (target === 'mdy') return `${month}/${day}/${year}`
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return trimmed
}

export function formatDecimalHours(
  value: number | null | undefined,
  options?: { emptyWhenZero?: boolean; emptyWhenNull?: boolean }
): string {
  const emptyWhenZero = options?.emptyWhenZero ?? false
  const emptyWhenNull = options?.emptyWhenNull ?? false

  if (value === null || value === undefined || Number.isNaN(value)) {
    return emptyWhenNull ? '' : '0.0'
  }

  const n = Number(value)
  if (emptyWhenZero && n === 0) return ''
  return n.toFixed(1)
}

export function formatWholeNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0'
  return String(Math.round(Number(value)))
}

export function escapeCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function buildCsvContent(
  headers: string[],
  rows: string[][],
  options?: { bom?: boolean }
): string {
  const lines = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map((cell) => escapeCsvValue(String(cell))).join(',')),
  ]
  const body = lines.join('\n')
  return options?.bom ? `\uFEFF${body}` : body
}

export function splitMakeModel(makeModel: string): { make: string; model: string } {
  const s = (makeModel || '').trim()
  if (!s) return { make: '', model: '' }
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return { make: '', model: parts[0]! }
  return { make: parts[0]!, model: parts.slice(1).join(' ') }
}

export function normalizeImportNumber(
  value: number | null | string | undefined
): number | null {
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/,/g, ''))
    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return null
    value = parsed
  }
  if (value === null || value === undefined || Number.isNaN(value)) return null
  const num = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(num) || !Number.isFinite(num)) return null
  const rounded = Math.round(num * 10) / 10
  return rounded >= 0 ? rounded : null
}

/** MyFlightbook exports Hold as "Yes"/blank; ForeFlight uses numeric Holds. */
export function normalizeImportHoldCount(
  value: number | null | string | undefined | boolean
): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value ? 1 : null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const lower = trimmed.toLowerCase()
    if (lower === 'yes' || lower === 'y' || lower === 'true') return 1
    if (lower === 'no' || lower === 'n' || lower === 'false') return null
  }
  const numeric = normalizeImportNumber(value)
  if (numeric === null) return null
  return numeric > 0 ? Math.round(numeric) : null
}
