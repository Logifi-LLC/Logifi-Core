import type { BridgeSource, ParsedBridgeFile } from './types'
import { detectBridgeSource } from './sourceDetector'
import { isLogtenDynamicExportHeaders } from './logtenDynamicExport'

/**
 * RFC 4180-style CSV records. Quoted fields may contain commas, quotes, and
 * newlines. Does not strip a leading quote that is part of the field value.
 */
export function parseCSVRecords(content: string, delimiter: string = ','): string[][] {
  const records: string[][] = []
  let row: string[] = []
  let current = ''
  let inQuotes = false
  const text = content.replace(/^\uFEFF/, '')

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && char === delimiter) {
      row.push(current)
      current = ''
      continue
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && nextChar === '\n') i++
      row.push(current)
      records.push(row)
      row = []
      current = ''
      continue
    }

    current += char
  }

  if (inQuotes || current.length > 0 || row.length > 0) {
    row.push(current)
    records.push(row)
  }

  return records
}

export function parseCSVLine(line: string, delimiter: string = ','): string[] {
  return parseCSVRecords(line, delimiter)[0] ?? ['']
}

export function detectDelimiter(line: string): string {
  let tabCount = 0
  let commaCount = 0
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (inQuotes) continue
    if (char === '\t') tabCount++
    else if (char === ',') commaCount++
  }

  return tabCount > commaCount ? '\t' : ','
}

function firstUnquotedLine(content: string): string {
  const text = content.replace(/^\uFEFF/, '')
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (!inQuotes && (char === '\n' || char === '\r')) {
      return text.slice(0, i)
    }
  }
  return text
}

function normalizeHeader(header: string): string {
  return header.trim()
}

/** Parser already unquoted the field; do not strip a leading content quote. */
function normalizeCell(value: string): string {
  return value.trim()
}

function isEmptyLineRecord(record: string[]): boolean {
  return record.length === 0 || (record.length === 1 && record[0] === '')
}

function isAllEmptyCells(values: string[]): boolean {
  return values.every((value) => !value.trim())
}

function headerSet(headers: string[]): Set<string> {
  return new Set(headers.map((h) => h.toLowerCase().trim()))
}

export function isForeFlightFlightsHeader(headers: string[]): boolean {
  const set = headerSet(headers)
  const hasAircraftId = set.has('aircraftid') || set.has('aircraft id')
  const hasDate = set.has('date') || set.has('flightdate')
  const hasFlightField =
    set.has('from') || set.has('totaltime') || set.has('total time') || set.has('to')
  return hasAircraftId && hasDate && hasFlightField
}

export function isForeFlightAircraftHeader(headers: string[]): boolean {
  const set = headerSet(headers)
  const hasAircraftId = set.has('aircraftid') || set.has('aircraft id')
  const hasMakeOrModel = set.has('make') || set.has('model')
  const isFlights = isForeFlightFlightsHeader(headers)
  return hasAircraftId && hasMakeOrModel && !isFlights
}

function rowsFromSection(
  records: string[][],
  startIndex: number,
  options?: { stopOnBlank?: boolean; stopOnForeFlightSectionHeaders?: boolean }
): { headers: string[]; rows: Record<string, string>[]; nextIndex: number } | null {
  const headerRecord = records[startIndex]
  if (!headerRecord || isEmptyLineRecord(headerRecord)) return null

  const headers = headerRecord.map(normalizeHeader)
  if (headers.every((h) => !h)) return null

  const rows: Record<string, string>[] = []
  let i = startIndex + 1
  for (; i < records.length; i++) {
    const record = records[i]
    if (!record) continue

    // WHY: ForeFlight CSVs separate Aircraft Table and Flights Table with a blank
    // row. Only stop there for ForeFlight section parsing — LogTen Dynamic exports
    // may include blank separator rows between flight data rows. Comma-filled
    // "blank" rows (,,,,,,,,) are skipped, not treated as section breaks.
    if (isEmptyLineRecord(record)) {
      if (options?.stopOnBlank && rows.length > 0) break
      continue
    }

    const values = record.map(normalizeCell)
    if (isAllEmptyCells(values)) continue

    if (options?.stopOnForeFlightSectionHeaders && rows.length > 0) {
      const maybeHeaders = values.map(normalizeHeader)
      if (
        isForeFlightFlightsHeader(maybeHeaders) ||
        isForeFlightAircraftHeader(maybeHeaders)
      ) {
        break
      }
    }

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      if (header) row[header] = values[index] || ''
    })
    rows.push(row)
  }

  return { headers, rows, nextIndex: i }
}

function isForeFlightSectionTitle(values: string[]): boolean {
  const first = (values[0] || '').trim().toLowerCase()
  return first === 'aircraft table' || first === 'flights table'
}

/** FAA-style ForeFlight hangar columns when the Aircraft Table header row is missing. */
const FOREFLIGHT_FAA_AIRCRAFT_HEADERS = [
  'AircraftID',
  'TypeCode',
  'Year',
  'Make',
  'Model',
  'GearType',
  'EngineType',
  'equipType (FAA)',
  'aircraftClass (FAA)',
] as const

function isLikelyForeFlightHangarId(id: string): boolean {
  const t = id.trim()
  if (!t) return false
  if (/^N[A-Z0-9]{1,6}$/i.test(t)) return true
  if (/no\s*tail/i.test(t)) return true
  return false
}

function isLikelyForeFlightHangarRow(values: string[]): boolean {
  if (isForeFlightSectionTitle(values)) return false
  const headers = values.map(normalizeHeader)
  if (isForeFlightFlightsHeader(headers) || isForeFlightAircraftHeader(headers)) return false
  if (!isLikelyForeFlightHangarId(values[0] || '')) return false
  const typeCode = (values[1] || '').trim()
  const make = (values[3] || '').trim()
  const model = (values[4] || '').trim()
  const blob = values.join(' ').toLowerCase()
  return (
    Boolean(typeCode || make || model) ||
    blob.includes('airplane_') ||
    blob.includes('rotorcraft')
  )
}

function parseHeaderlessAircraftRows(
  records: string[][],
  flightsHeaderIndex: number
): { headers: string[]; rows: Record<string, string>[] } | undefined {
  const headers = [...FOREFLIGHT_FAA_AIRCRAFT_HEADERS]
  const rows: Record<string, string>[] = []

  for (let i = 0; i < flightsHeaderIndex; i++) {
    const record = records[i]
    if (!record || isEmptyLineRecord(record)) continue
    const values = record.map(normalizeCell)
    if (isAllEmptyCells(values)) continue
    if (!isLikelyForeFlightHangarRow(values)) continue

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    rows.push(row)
  }

  return rows.length > 0 ? { headers, rows } : undefined
}

function findForeFlightSections(
  records: string[][],
  delimiter: string
): {
  aircraft?: { headers: string[]; rows: Record<string, string>[] }
  flights?: { headers: string[]; rows: Record<string, string>[]; delimiter: string }
} {
  let aircraftSection: { headers: string[]; rows: Record<string, string>[] } | undefined
  let flightsSection:
    | { headers: string[]; rows: Record<string, string>[]; delimiter: string }
    | undefined

  // WHY: ForeFlight exports use comma-filled "blank" rows and a "Flights Table"
  // banner. A single forward scan that assigns i = nextIndex then i++ skips the
  // Date header. Scan aircraft and flights independently.
  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    if (!record || isEmptyLineRecord(record) || isAllEmptyCells(record.map(normalizeCell))) {
      continue
    }

    const headers = record.map(normalizeHeader)
    if (isForeFlightSectionTitle(headers)) continue

    if (isForeFlightAircraftHeader(headers)) {
      const parsed = rowsFromSection(records, i, {
        stopOnBlank: false,
        stopOnForeFlightSectionHeaders: true,
      })
      if (parsed) {
        aircraftSection = {
          headers: parsed.headers,
          rows: parsed.rows.filter((row) => {
            const id = (row.AircraftID || row['Aircraft ID'] || '').trim().toLowerCase()
            return id !== 'aircraft table' && id !== 'flights table'
          }),
        }
      }
      break
    }
  }

  let flightsHeaderIndex = -1

  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    if (!record || isEmptyLineRecord(record) || isAllEmptyCells(record.map(normalizeCell))) {
      continue
    }

    const headers = record.map(normalizeHeader)
    if (isForeFlightSectionTitle(headers)) continue

    if (isForeFlightFlightsHeader(headers) && !isLogtenDynamicExportHeaders(headers)) {
      flightsHeaderIndex = i
      const parsed = rowsFromSection(records, i, {
        stopOnBlank: true,
        stopOnForeFlightSectionHeaders: true,
      })
      if (parsed) {
        flightsSection = {
          headers: parsed.headers,
          rows: parsed.rows,
          delimiter,
        }
      }
      break
    }
  }

  if (!aircraftSection && flightsHeaderIndex > 0 && flightsSection) {
    aircraftSection = parseHeaderlessAircraftRows(records, flightsHeaderIndex)
  }

  return { aircraft: aircraftSection, flights: flightsSection }
}

export function parseBridgeFile(
  content: string,
  sourceOverride?: BridgeSource
): ParsedBridgeFile {
  const delimiter = detectDelimiter(firstUnquotedLine(content))
  const records = parseCSVRecords(content, delimiter)
  const foreFlight = findForeFlightSections(records, delimiter)

  if (foreFlight.flights) {
    const source = sourceOverride ?? 'foreflight'
    return {
      source,
      delimiter: foreFlight.flights.delimiter,
      headers: foreFlight.flights.headers,
      rows: foreFlight.flights.rows,
      aircraftHeaders: foreFlight.aircraft?.headers,
      aircraftRows: foreFlight.aircraft?.rows,
      skippedAircraftRows: foreFlight.aircraft?.rows.length ?? 0,
    }
  }

  const firstNonEmpty = records.findIndex(
    (record) => record && !isEmptyLineRecord(record) && !isAllEmptyCells(record.map(normalizeCell))
  )
  if (firstNonEmpty < 0) {
    return {
      source: sourceOverride ?? 'generic',
      delimiter,
      headers: [],
      rows: [],
      skippedAircraftRows: 0,
    }
  }

  const parsed = rowsFromSection(records, firstNonEmpty)
  const headers = parsed?.headers ?? []
  const rows = parsed?.rows ?? []
  const source = sourceOverride ?? detectBridgeSource(headers)

  return {
    source,
    delimiter,
    headers,
    rows,
    skippedAircraftRows: 0,
  }
}

export function parseBridgeFileContent(content: string): Record<string, string>[] {
  return parseBridgeFile(content).rows
}
