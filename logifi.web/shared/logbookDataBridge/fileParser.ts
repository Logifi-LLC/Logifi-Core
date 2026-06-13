import type { BridgeSource, ParsedBridgeFile } from './types'
import { detectBridgeSource } from './sourceDetector'
import { isLogtenDynamicExportHeaders } from './logtenDynamicExport'

export function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

export function detectDelimiter(line: string): string {
  const tabCount = (line.match(/\t/g) || []).length
  const commaCount = (line.match(/,/g) || []).length
  return tabCount > commaCount ? '\t' : ','
}

function normalizeHeader(header: string): string {
  return header.trim().replace(/^"|"$/g, '')
}

function normalizeCell(value: string): string {
  return value.trim().replace(/^"|"$/g, '').replace(/""/g, '"')
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
  lines: string[],
  startIndex: number,
  delimiter: string
): { headers: string[]; rows: Record<string, string>[]; nextIndex: number } | null {
  const headerLine = lines[startIndex]
  if (!headerLine?.trim()) return null

  const headers = parseCSVLine(headerLine, delimiter).map(normalizeHeader)
  if (headers.every((h) => !h)) return null

  const rows: Record<string, string>[] = []
  let i = startIndex + 1
  for (; i < lines.length; i++) {
    const line = lines[i]
    if (!line?.trim()) continue

    const values = parseCSVLine(line, delimiter).map(normalizeCell)
    if (values.every((v) => !v)) continue

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      if (header) row[header] = values[index] || ''
    })
    rows.push(row)
  }

  return { headers, rows, nextIndex: i }
}

function findForeFlightSections(lines: string[]): {
  aircraft?: { headers: string[]; rows: Record<string, string>[] }
  flights?: { headers: string[]; rows: Record<string, string>[]; delimiter: string }
} {
  let aircraftSection: { headers: string[]; rows: Record<string, string>[] } | undefined
  let flightsSection:
    | { headers: string[]; rows: Record<string, string>[]; delimiter: string }
    | undefined

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line?.trim()) continue

    const delimiter = detectDelimiter(line)
    const headers = parseCSVLine(line, delimiter).map(normalizeHeader)

    if (isForeFlightFlightsHeader(headers) && !isLogtenDynamicExportHeaders(headers)) {
      const parsed = rowsFromSection(lines, i, delimiter)
      if (parsed) {
        flightsSection = {
          headers: parsed.headers,
          rows: parsed.rows,
          delimiter,
        }
      }
      break
    }

    if (isForeFlightAircraftHeader(headers)) {
      const parsed = rowsFromSection(lines, i, delimiter)
      if (parsed) {
        aircraftSection = { headers: parsed.headers, rows: parsed.rows }
        i = parsed.nextIndex
      }
    }
  }

  return { aircraft: aircraftSection, flights: flightsSection }
}

export function parseBridgeFile(
  content: string,
  sourceOverride?: BridgeSource
): ParsedBridgeFile {
  const lines = content.split(/\r?\n/)
  const foreFlight = findForeFlightSections(lines)

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

  const firstNonEmpty = lines.findIndex((l) => l.trim())
  if (firstNonEmpty < 0) {
    return {
      source: sourceOverride ?? 'generic',
      delimiter: ',',
      headers: [],
      rows: [],
      skippedAircraftRows: 0,
    }
  }

  const delimiter = detectDelimiter(lines[firstNonEmpty]!)
  const parsed = rowsFromSection(lines, firstNonEmpty, delimiter)
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
