import { describe, expect, it } from 'vitest'
import type { LogEntry } from '../logbookTypes'
import { createEmptyFlightTime, createEmptyPerformance } from '../logbookTypes'
import { generatePaperLogbookPdf, paperLogbookFilename } from '../logbookPdf'
import {
  ROUTE_REMARKS_COLUMN_BASE_WIDTH,
  rowHeightForLineCount,
  wrapTextToLinesWithFont,
} from '../logbookPdfText'
import {
  joinedLineText,
  normalizeWrappedText,
  wrapTextToLines,
} from '../logbookPdfText'
import { entryToPaperRow, paginatePaperLogbook } from '../logbookPrintLayout'

function entry(overrides: Partial<LogEntry> & { id: string; date: string }): LogEntry {
  return {
    role: 'PIC',
    aircraftCategoryClass: 'ASEL',
    categoryClassTime: null,
    aircraftMakeModel: 'C172',
    registration: 'N100AA',
    flightNumber: null,
    departure: 'KPAO',
    destination: 'KSQL',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: [],
    remarks: '',
    flightTime: createEmptyFlightTime(),
    performance: createEmptyPerformance(),
    ...overrides,
  }
}

describe('logbookPdf text layout', () => {
  it('uses a wider route / remarks column base width', () => {
    expect(ROUTE_REMARKS_COLUMN_BASE_WIDTH).toBe(108)
  })

  it('wraps long remarks without losing characters', async () => {
    const { PDFDocument, StandardFonts } = await import('pdf-lib')
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const original =
      'Direct KPAO to KSQL with vectors for pattern work and a long unbroken token ABCDEFGHIJKLMNOPQRSTUVWXYZ segment'
    const maxWidth = 90
    const lines = wrapTextToLinesWithFont(original, font, 6.5, maxWidth)
    expect(lines.length).toBeGreaterThan(1)
    expect(joinedLineText(lines).replace(/\s/g, '')).toBe(normalizeWrappedText(original).replace(/\s/g, ''))
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 6.5)).toBeLessThanOrEqual(maxWidth + 0.01)
    }
  })

  it('grows row height with wrapped line count', () => {
    expect(rowHeightForLineCount(1)).toBe(13)
    expect(rowHeightForLineCount(3)).toBeGreaterThan(13)
    expect(rowHeightForLineCount(5)).toBeGreaterThan(rowHeightForLineCount(3))
  })

  it('hard-breaks an oversized unbroken token via measure callback', () => {
    const measure = (chunk: string) => chunk.length * 4
    const lines = wrapTextToLines('aaaaaaaaaaaaaaaa', 12, measure)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join('')).toBe('aaaaaaaaaaaaaaaa')
  })
})

describe('logbookPdf', () => {
  it('builds a filename from the date range', () => {
    expect(paperLogbookFilename({ dateStart: '2024-03-01', dateEnd: '2024-03-31' })).toBe(
      'logifi-logbook-2024-03-01-to-2024-03-31.pdf'
    )
  })

  it('yields between pages when more than one PDF page is produced', async () => {
    const many: LogEntry[] = Array.from({ length: 20 }, (_, i) =>
      entry({
        id: `n${i}`,
        date: `2024-04-${String(i + 1).padStart(2, '0')}`,
        flightTime: { ...createEmptyFlightTime(), total: 1.0, pic: 1.0 },
      })
    )
    let yields = 0
    const bytes = await generatePaperLogbookPdf(many, {
      rowsPerPage: 8,
      yieldFn: async () => {
        yields += 1
      },
    })
    const header = String.fromCharCode(...bytes.slice(0, 5))
    expect(header).toBe('%PDF-')
    const { PDFDocument } = await import('pdf-lib')
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBe(3)
    expect(yields).toBe(2)
  })

  it('adds continuation PDF sheets for tall remarks while keeping paper totals', async () => {
    const longRemarks =
      'Night cross-country via SUNOL Moffett SJC with repeated pattern work, ' +
      'holds at FIXES, and a very long narrative that would have been truncated before wrapping was added. ' +
      'Additional detail about maneuvering speed work, unusual attitude recoveries, and a full-stop taxi-back.'
    const paragraph = (n: number) => `${longRemarks} (flight ${n}).`
    const book: LogEntry[] = Array.from({ length: 13 }, (_, i) =>
      entry({
        id: `tall-${i}`,
        date: `2025-06-${String(i + 1).padStart(2, '0')}`,
        remarks: paragraph(i + 1),
        route: 'V25 SUNOL',
        flightTime: { ...createEmptyFlightTime(), total: 1.1, pic: 1.1 },
      })
    )
    const layout = paginatePaperLogbook(book, { rowsPerPage: 13 })
    expect(layout.pages).toHaveLength(1)
    expect(layout.pages[0]!.pageTotals.total).toBeCloseTo(13 * 1.1, 1)

    const paperRow = entryToPaperRow(book[0]!)
    expect(paperRow.routeRemarks).toContain('V25 SUNOL')

    const bytes = await generatePaperLogbookPdf(book, { rowsPerPage: 13 })
    const { PDFDocument } = await import('pdf-lib')
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBeGreaterThan(1)
  })
})