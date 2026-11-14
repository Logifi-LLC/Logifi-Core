import { formatDecimalHours } from '../../shared/logbookDataBridge/formatters'
import { localCalendarYmd } from '../../shared/localCalendarDate'
import {
  get8710CategoryLabel,
  type Form8710Data,
  type TimeTotals,
} from './form8710Types'

type PDFPage = import('pdf-lib').PDFPage
type PDFFont = import('pdf-lib').PDFFont
type RGB = import('pdf-lib').RGB

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 36

function hours(value: number | null | undefined): string {
  const n = value ?? 0
  if (n === 0) return '—'
  return formatDecimalHours(n)
}

function fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const raw = text || ''
  if (font.widthOfTextAtSize(raw, size) <= maxWidth) return raw
  let trimmed = raw
  while (trimmed.length > 0 && font.widthOfTextAtSize(`${trimmed}…`, size) > maxWidth) {
    trimmed = trimmed.slice(0, -1)
  }
  return trimmed ? `${trimmed}…` : ''
}

function drawText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  x: number,
  y: number,
  color: RGB,
  maxWidth?: number
): void {
  const fitted = maxWidth ? fitText(text, font, size, maxWidth) : text
  page.drawText(fitted, { x, y, size, font, color })
}

function drawKv(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  black: RGB,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number
): number {
  drawText(page, label.toUpperCase(), bold, 7, x, y, black)
  page.drawRectangle({
    x,
    y: y - 22,
    width,
    height: 18,
    borderWidth: 0.6,
    borderColor: black,
  })
  drawText(page, value || '_________________', font, 9, x + 4, y - 17, black, width - 8)
  return y - 36
}

interface TableCol {
  key: string
  label: string
  width: number
  align: 'left' | 'right' | 'center'
}

function drawTable(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  black: RGB,
  gray: RGB,
  x: number,
  top: number,
  columns: TableCol[],
  rows: string[][],
  rowH = 14
): number {
  let y = top
  const headerH = 16
  const drawRow = (cells: string[], height: number, header: boolean) => {
    let cx = x
    const bottom = y - height
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i]!
      page.drawRectangle({
        x: cx,
        y: bottom,
        width: col.width,
        height,
        borderWidth: 0.4,
        borderColor: black,
        color: header ? gray : undefined,
      })
      const size = header ? 6.5 : 7
      const used = header ? bold : font
      const text = cells[i] ?? ''
      const pad = 3
      const max = col.width - pad * 2
      const fitted = fitText(text, used, size, max)
      const tw = used.widthOfTextAtSize(fitted, size)
      let tx = cx + pad
      if (col.align === 'right') tx = cx + col.width - pad - tw
      if (col.align === 'center') tx = cx + (col.width - tw) / 2
      page.drawText(fitted, { x: Math.max(cx + 1, tx), y: bottom + 4, size, font: used, color: black })
      cx += col.width
    }
    y = bottom
  }

  drawRow(columns.map((c) => c.label), headerH, true)
  for (const row of rows) drawRow(row, rowH, false)
  return y
}

function periodRow(label: string, totals: TimeTotals): string[] {
  return [
    label,
    hours(totals.totalTime),
    hours(totals.picTime),
    hours(totals.sicTime),
    hours(totals.instructionReceived),
    hours(totals.soloTime),
    hours(totals.crossCountryTime),
    hours(totals.instrumentTime),
    hours(totals.nightTime),
  ]
}

export function form8710PdfFilename(now: Date = new Date()): string {
  return `logifi-8710-${localCalendarYmd(now)}.pdf`
}

/** Layout-only view of calculator output. Does not recompute 8710 math. */
export function buildForm8710PdfRows(data: Form8710Data): {
  sectionII: string[][]
  sectionIII: string[][]
} {
  const ii = data.sectionII
  const sectionII = [
    periodRow('Last 6 Months', ii.last6Months),
    periodRow('Last 12 Months', ii.last12Months),
    periodRow('Last 24 Months', ii.last24Months),
    periodRow('All Time', ii.allTime),
  ]
  const sectionIII = data.sectionIII.categories.map((category) => [
    get8710CategoryLabel(category.category),
    String(category.totalFlights),
    hours(category.instructionReceived),
    hours(category.solo),
    hours(category.pic),
    hours(category.sic),
    hours(category.crossCountryInstructionReceived),
    hours(category.crossCountrySolo),
    hours(category.crossCountryPic),
    hours(category.crossCountrySic),
    hours(category.instrument),
    hours(category.nightPic + category.nightSic + category.nightInstructionReceived),
    hours(category.nightPic),
    hours(category.nightSic),
  ])
  return { sectionII, sectionIII }
}

export async function generateForm8710Pdf(data: Form8710Data): Promise<Uint8Array> {
  const pdfLib = await import('pdf-lib')
  const pdf = await pdfLib.PDFDocument.create()
  const font = await pdf.embedFont(pdfLib.StandardFonts.Helvetica)
  const bold = await pdf.embedFont(pdfLib.StandardFonts.HelveticaBold)
  const black = pdfLib.rgb(0, 0, 0)
  const gray = pdfLib.rgb(0.9, 0.9, 0.9)
  const rows = buildForm8710PdfRows(data)

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - MARGIN

  drawText(page, 'FAA Form 8710-1', bold, 16, MARGIN, y - 12, black)
  y -= 18
  drawText(page, 'Airman Certificate and/or Rating Application', font, 9, MARGIN, y - 8, black)
  y -= 28

  drawText(page, 'I. APPLICATION INFORMATION', bold, 11, MARGIN, y, black)
  y -= 18
  const colW = (PAGE_WIDTH - MARGIN * 2 - 12) / 2
  const s1 = data.sectionI
  const leftY = drawKv(page, font, bold, black, 'Name', s1.name, MARGIN, y, colW)
  drawKv(page, font, bold, black, 'Date of Birth (MM/DD/YYYY)', s1.dateOfBirth, MARGIN + colW + 12, y, colW)
  y = leftY
  const pobY = drawKv(page, font, bold, black, 'Place of Birth', s1.placeOfBirth, MARGIN, y, colW)
  drawKv(
    page,
    font,
    bold,
    black,
    'Certificate Number',
    s1.certificateNumber || '',
    MARGIN + colW + 12,
    y,
    colW
  )
  y = pobY
  const residential = [s1.residentialAddress, s1.residentialCity, s1.residentialState, s1.residentialZip]
    .filter(Boolean)
    .join(', ')
  y = drawKv(page, font, bold, black, 'Residential Address', residential, MARGIN, y, PAGE_WIDTH - MARGIN * 2)
  const mailing = [s1.mailingAddress, s1.mailingCity, s1.mailingState, s1.mailingZip]
    .filter(Boolean)
    .join(', ')
  if (mailing) {
    y = drawKv(page, font, bold, black, 'Mailing Address (if different)', mailing, MARGIN, y, PAGE_WIDTH - MARGIN * 2)
  }

  y -= 8
  drawText(page, 'II. RECENT EXPERIENCE', bold, 11, MARGIN, y, black)
  y -= 14
  const sectionIICols: TableCol[] = [
    { key: 'period', label: 'Period', width: 88, align: 'left' },
    { key: 'total', label: 'Total', width: 52, align: 'right' },
    { key: 'pic', label: 'PIC', width: 52, align: 'right' },
    { key: 'sic', label: 'SIC', width: 52, align: 'right' },
    { key: 'dual', label: 'Instr Rcv', width: 56, align: 'right' },
    { key: 'solo', label: 'Solo', width: 48, align: 'right' },
    { key: 'xc', label: 'XC', width: 48, align: 'right' },
    { key: 'inst', label: 'Inst', width: 48, align: 'right' },
    { key: 'night', label: 'Night', width: 48, align: 'right' },
  ]
  y = drawTable(page, font, bold, black, gray, MARGIN, y, sectionIICols, rows.sectionII, 15)

  y -= 16
  drawText(page, 'III. RECORD OF PILOT TIME', bold, 11, MARGIN, y, black)
  y -= 14

  const sectionIIIWidth = PAGE_WIDTH - MARGIN * 2
  const catW = 92
  const otherW = (sectionIIIWidth - catW) / 13
  const sectionIIICols: TableCol[] = [
    { key: 'cat', label: 'Category', width: catW, align: 'left' },
    { key: 'flights', label: 'Flights', width: otherW, align: 'center' },
    { key: 'dual', label: 'Instr Rcv', width: otherW, align: 'right' },
    { key: 'solo', label: 'Solo', width: otherW, align: 'right' },
    { key: 'pic', label: 'PIC', width: otherW, align: 'right' },
    { key: 'sic', label: 'SIC', width: otherW, align: 'right' },
    { key: 'xcI', label: 'XC Instr', width: otherW, align: 'right' },
    { key: 'xcS', label: 'XC Solo', width: otherW, align: 'right' },
    { key: 'xcP', label: 'XC PIC', width: otherW, align: 'right' },
    { key: 'xcC', label: 'XC SIC', width: otherW, align: 'right' },
    { key: 'inst', label: 'Inst', width: otherW, align: 'right' },
    { key: 'night', label: 'Night', width: otherW, align: 'right' },
    { key: 'nPic', label: 'N PIC', width: otherW, align: 'right' },
    { key: 'nSic', label: 'N SIC', width: otherW, align: 'right' },
  ]

  if (y < 220) {
    y = PAGE_HEIGHT - MARGIN
    pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  }
  const tablePage = pdf.getPages()[pdf.getPageCount() - 1]!
  y = drawTable(tablePage, font, bold, black, gray, MARGIN, y, sectionIIICols, rows.sectionIII, 13)

  const meta = data.complianceMetadata
  if (meta) {
    y -= 18
    if (y < 80) {
      const extra = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      y = PAGE_HEIGHT - MARGIN
      drawText(extra, 'COMPLIANCE METADATA', bold, 11, MARGIN, y, black)
      y -= 16
      drawText(extra, `Total entries: ${meta.totalEntries}   Imported: ${meta.importedEntries}   Manual: ${meta.manualEntries}`, font, 9, MARGIN, y, black)
    } else {
      drawText(tablePage, 'COMPLIANCE METADATA', bold, 11, MARGIN, y, black)
      y -= 16
      drawText(
        tablePage,
        `Total entries: ${meta.totalEntries}   Imported: ${meta.importedEntries}   Manual: ${meta.manualEntries}`,
        font,
        9,
        MARGIN,
        y,
        black
      )
    }
  }

  return pdf.save()
}
