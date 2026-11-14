import { describe, expect, it } from 'vitest'
import type { LogEntry } from '../logbookTypes'
import { createEmptyFlightTime, createEmptyPerformance } from '../logbookTypes'
import { generatePaperLogbookPdf, paperLogbookFilename } from '../logbookPdf'

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
})
