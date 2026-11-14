import { describe, expect, it } from 'vitest'
import { calculateSectionII, calculateSectionIII } from '../form8710Calculator'
import { buildForm8710PdfRows, form8710PdfFilename, generateForm8710Pdf } from '../form8710Pdf'
import type { Form8710Data } from '../form8710Types'
import type { LogEntry } from '../logbookTypes'
import { createEmptyFlightTime, createEmptyPerformance } from '../logbookTypes'

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

describe('form8710Pdf', () => {
  it('mirrors calculator section II/III numbers without changing them', () => {
    const entries: LogEntry[] = [
      entry({
        id: 'sel',
        date: '2024-06-01',
        flightTime: {
          ...createEmptyFlightTime(),
          total: 2.0,
          pic: 2.0,
          crossCountry: 1.0,
          night: 0.5,
        },
      }),
      entry({
        id: 'mel',
        date: '2024-06-02',
        role: 'SIC',
        aircraftCategoryClass: 'AMEL',
        aircraftMakeModel: 'E175',
        flightTime: {
          ...createEmptyFlightTime(),
          total: 3.5,
          sic: 3.5,
          actualInstrument: 0.4,
        },
      }),
    ]
    const sectionII = calculateSectionII(entries)
    const sectionIII = calculateSectionIII(entries)
    const data: Form8710Data = {
      sectionI: {
        name: 'Test Pilot',
        dateOfBirth: '01/01/1990',
        placeOfBirth: 'Austin, TX',
        residentialAddress: '1 Main St',
        residentialCity: 'Austin',
        residentialState: 'TX',
        residentialZip: '78701',
      },
      sectionII,
      sectionIII,
    }
    const rows = buildForm8710PdfRows(data)
    const allTime = rows.sectionII[3]
    expect(allTime?.[1]).toBe('5.5')
    expect(allTime?.[2]).toBe('2.0')
    expect(allTime?.[3]).toBe('3.5')
    const sel = rows.sectionIII.find((row) => row[0] === 'Airplane SEL')
    const mel = rows.sectionIII.find((row) => row[0] === 'Airplane MEL')
    expect(sel?.[4]).toBe('2.0')
    expect(mel?.[5]).toBe('3.5')
  })

  it('names the 8710 PDF with a calendar date', () => {
    expect(form8710PdfFilename(new Date(2026, 10, 14))).toBe('logifi-8710-2026-11-14.pdf')
  })

  it('writes a real PDF from calculator output', async () => {
    const entries: LogEntry[] = [
      entry({
        id: 'one',
        date: '2024-01-01',
        flightTime: { ...createEmptyFlightTime(), total: 1.2, pic: 1.2 },
      }),
    ]
    const bytes = await generateForm8710Pdf({
      sectionI: {
        name: 'Test Pilot',
        dateOfBirth: '',
        placeOfBirth: '',
        residentialAddress: '',
        residentialCity: '',
        residentialState: '',
        residentialZip: '',
      },
      sectionII: calculateSectionII(entries),
      sectionIII: calculateSectionIII(entries),
    })
    const header = String.fromCharCode(...bytes.slice(0, 5))
    expect(header).toBe('%PDF-')
    const { PDFDocument } = await import('pdf-lib')
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1)
  })
})
