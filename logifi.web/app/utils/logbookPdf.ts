import { localCalendarYmd } from '../../shared/localCalendarDate'
import type { LogEntry } from './logbookTypes'
import {
  DEFAULT_ROWS_PER_PAGE,
  PAPER_LOGBOOK_CERTIFICATION,
  clampRowsPerPage,
  formatPaperCount,
  formatPaperHours,
  paginatePaperLogbook,
  type PaginatePaperLogbookOptions,
  type PaperLogbookPage,
  type PaperLogbookRow,
  type PaperLogbookTotals,
} from './logbookPrintLayout'

export interface GeneratePaperLogbookPdfOptions extends PaginatePaperLogbookOptions {
  onProgress?: (done: number, total: number) => void
  yieldFn?: () => Promise<void>
}

const PAGE_WIDTH = 792
const PAGE_HEIGHT = 612
const MARGIN_X = 22
const MARGIN_TOP = 24
const MARGIN_BOTTOM = 28

type PdfLib = typeof import('pdf-lib')
type PDFPage = import('pdf-lib').PDFPage
type PDFFont = import('pdf-lib').PDFFont
type RGB = import('pdf-lib').RGB

interface Column {
  key: string
  label: string
  width: number
  align: 'left' | 'right' | 'center'
}

const COLUMNS: Column[] = [
  { key: 'date', label: 'Date', width: 48, align: 'left' },
  { key: 'aircraftType', label: 'Type', width: 50, align: 'left' },
  { key: 'ident', label: 'Ident', width: 44, align: 'left' },
  { key: 'from', label: 'From', width: 32, align: 'center' },
  { key: 'to', label: 'To', width: 32, align: 'center' },
  { key: 'routeRemarks', label: 'Route / Remarks', width: 88, align: 'left' },
  { key: 'approaches', label: 'App', width: 24, align: 'right' },
  { key: 'dayLandings', label: 'D Ldg', width: 26, align: 'right' },
  { key: 'nightLandings', label: 'N Ldg', width: 26, align: 'right' },
  { key: 'categoryClass', label: 'Cat', width: 32, align: 'center' },
  { key: 'pic', label: 'PIC', width: 30, align: 'right' },
  { key: 'sic', label: 'SIC', width: 30, align: 'right' },
  { key: 'dualReceived', label: 'Dual R', width: 32, align: 'right' },
  { key: 'dualGiven', label: 'Dual G', width: 32, align: 'right' },
  { key: 'crossCountry', label: 'XC', width: 28, align: 'right' },
  { key: 'night', label: 'Night', width: 30, align: 'right' },
  { key: 'actualInstrument', label: 'Act', width: 28, align: 'right' },
  { key: 'simulatedInstrument', label: 'Sim', width: 28, align: 'right' },
  { key: 'total', label: 'Total', width: 32, align: 'right' },
]

function scaledColumns(): Column[] {
  const inner = PAGE_WIDTH - MARGIN_X * 2
  const raw = COLUMNS.reduce((sum, col) => sum + col.width, 0)
  const scale = inner / raw
  return COLUMNS.map((col) => ({ ...col, width: col.width * scale }))
}

async function defaultYield(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
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

function cellText(
  row: PaperLogbookRow | null,
  key: string,
  emptyWhenZero: boolean
): string {
  if (!row) return ''
  switch (key) {
    case 'date':
      return row.date
    case 'aircraftType':
      return row.aircraftType
    case 'ident':
      return row.ident
    case 'from':
      return row.from
    case 'to':
      return row.to
    case 'routeRemarks':
      return row.routeRemarks
    case 'categoryClass':
      return row.categoryClass
    case 'approaches':
      return formatPaperCount(row.approaches, { emptyWhenZero })
    case 'dayLandings':
      return formatPaperCount(row.dayLandings, { emptyWhenZero })
    case 'nightLandings':
      return formatPaperCount(row.nightLandings, { emptyWhenZero })
    case 'pic':
      return formatPaperHours(row.pic, { emptyWhenZero })
    case 'sic':
      return formatPaperHours(row.sic, { emptyWhenZero })
    case 'dualReceived':
      return formatPaperHours(row.dualReceived, { emptyWhenZero })
    case 'dualGiven':
      return formatPaperHours(row.dualGiven, { emptyWhenZero })
    case 'crossCountry':
      return formatPaperHours(row.crossCountry, { emptyWhenZero })
    case 'night':
      return formatPaperHours(row.night, { emptyWhenZero })
    case 'actualInstrument':
      return formatPaperHours(row.actualInstrument, { emptyWhenZero })
    case 'simulatedInstrument':
      return formatPaperHours(row.simulatedInstrument, { emptyWhenZero })
    case 'total':
      return formatPaperHours(row.total, { emptyWhenZero })
    default:
      return ''
  }
}

function totalsCell(totals: PaperLogbookTotals, key: string): string {
  switch (key) {
    case 'approaches':
      return formatPaperCount(totals.approaches)
    case 'dayLandings':
      return formatPaperCount(totals.dayLandings)
    case 'nightLandings':
      return formatPaperCount(totals.nightLandings)
    case 'pic':
      return formatPaperHours(totals.pic)
    case 'sic':
      return formatPaperHours(totals.sic)
    case 'dualReceived':
      return formatPaperHours(totals.dualReceived)
    case 'dualGiven':
      return formatPaperHours(totals.dualGiven)
    case 'crossCountry':
      return formatPaperHours(totals.crossCountry)
    case 'night':
      return formatPaperHours(totals.night)
    case 'actualInstrument':
      return formatPaperHours(totals.actualInstrument)
    case 'simulatedInstrument':
      return formatPaperHours(totals.simulatedInstrument)
    case 'total':
      return formatPaperHours(totals.total)
    default:
      return ''
  }
}

function drawAlignedText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  x: number,
  width: number,
  y: number,
  align: Column['align'],
  color: RGB
): void {
  const pad = 2
  const max = Math.max(4, width - pad * 2)
  const fitted = fitText(text, font, size, max)
  const textWidth = font.widthOfTextAtSize(fitted, size)
  let tx = x + pad
  if (align === 'right') tx = x + width - pad - textWidth
  if (align === 'center') tx = x + (width - textWidth) / 2
  page.drawText(fitted, { x: Math.max(x + 1, tx), y, size, font, color })
}

function drawPage(
  pdf: PdfLib,
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  black: RGB,
  gray: RGB,
  docMeta: {
    pilotName: string
    certificateNumber: string
    dateStart: string | null
    dateEnd: string | null
  },
  paperPage: PaperLogbookPage
): void {
  const cols = scaledColumns()
  const tableWidth = cols.reduce((sum, col) => sum + col.width, 0)
  const headerH = 16
  const rowH = 13
  const summaryH = 13
  let y = PAGE_HEIGHT - MARGIN_TOP

  page.drawText('PILOT LOGBOOK', {
    x: MARGIN_X,
    y: y - 10,
    size: 11,
    font: bold,
    color: black,
  })
  const pageLabel = `Page ${paperPage.pageNumber} of ${paperPage.pageCount}`
  const pageLabelWidth = font.widthOfTextAtSize(pageLabel, 9)
  page.drawText(pageLabel, {
    x: MARGIN_X + tableWidth - pageLabelWidth,
    y: y - 10,
    size: 9,
    font,
    color: black,
  })
  y -= 22

  const identity = [docMeta.pilotName, docMeta.certificateNumber]
    .filter(Boolean)
    .join('  ·  ')
  if (identity) {
    page.drawText(identity, { x: MARGIN_X, y: y - 8, size: 8, font, color: black })
  }
  const rangeBits = [docMeta.dateStart, docMeta.dateEnd].filter(Boolean)
  if (rangeBits.length) {
    const range = `Entries ${docMeta.dateStart || '…'} – ${docMeta.dateEnd || '…'}`
    const rangeWidth = font.widthOfTextAtSize(range, 8)
    page.drawText(range, {
      x: MARGIN_X + tableWidth - rangeWidth,
      y: y - 8,
      size: 8,
      font,
      color: black,
    })
  }
  y -= 16

  const drawCells = (
    values: string[],
    height: number,
    options: { fill?: RGB; font?: PDFFont; size?: number; labelCols?: number }
  ) => {
    const usedFont = options.font ?? font
    const size = options.size ?? 6.5
    let x = MARGIN_X
    const bottom = y - height
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i]!
      page.drawRectangle({
        x,
        y: bottom,
        width: col.width,
        height,
        borderWidth: 0.4,
        borderColor: black,
        color: options.fill,
      })
      const isLabel = (options.labelCols ?? 0) > 0 && i < (options.labelCols ?? 0)
      if (!isLabel || i === 0) {
        const text = isLabel ? values[0] ?? '' : values[i] ?? ''
        drawAlignedText(
          page,
          text,
          usedFont,
          size,
          x,
          isLabel && i === 0
            ? cols.slice(0, options.labelCols).reduce((s, c) => s + c.width, 0)
            : col.width,
          bottom + 3.5,
          isLabel ? 'left' : col.align,
          black
        )
      }
      x += col.width
    }
    y = bottom
  }

  drawCells(
    cols.map((col) => col.label),
    headerH,
    { fill: gray, font: bold, size: 6.5 }
  )

  const summaryValues = (label: string, totals: PaperLogbookTotals): string[] =>
    cols.map((col) => {
      if (col.key === 'date') return label
      if (
        col.key === 'aircraftType' ||
        col.key === 'ident' ||
        col.key === 'from' ||
        col.key === 'to' ||
        col.key === 'routeRemarks' ||
        col.key === 'categoryClass'
      ) {
        return ''
      }
      return totalsCell(totals, col.key)
    })

  drawCells(summaryValues('Amount forwarded', paperPage.amountForwarded), summaryH, {
    fill: pdf.rgb(0.95, 0.95, 0.95),
    font: bold,
    size: 6.5,
    labelCols: 6,
  })

  for (const slot of paperPage.slots) {
    drawCells(
      cols.map((col) => cellText(slot, col.key, true)),
      rowH,
      { size: 6.5 }
    )
  }

  drawCells(summaryValues('Totals this page', paperPage.pageTotals), summaryH, {
    fill: pdf.rgb(0.95, 0.95, 0.95),
    font: bold,
    size: 6.5,
    labelCols: 6,
  })
  drawCells(summaryValues('Totals to date', paperPage.totalsToDate), summaryH, {
    fill: gray,
    font: bold,
    size: 6.5,
    labelCols: 6,
  })

  y -= 16
  page.drawText(PAPER_LOGBOOK_CERTIFICATION, {
    x: MARGIN_X,
    y,
    size: 8,
    font,
    color: black,
  })
  y -= 18
  page.drawText('Signature', { x: MARGIN_X, y, size: 8, font, color: black })
  page.drawLine({
    start: { x: MARGIN_X + 52, y: y - 1 },
    end: { x: MARGIN_X + 280, y: y - 1 },
    thickness: 0.6,
    color: black,
  })
  page.drawText('Date', { x: MARGIN_X + 300, y, size: 8, font, color: black })
  page.drawLine({
    start: { x: MARGIN_X + 326, y: y - 1 },
    end: { x: MARGIN_X + 440, y: y - 1 },
    thickness: 0.6,
    color: black,
  })
}

export function paperLogbookFilename(options: {
  dateStart?: string | null
  dateEnd?: string | null
  now?: Date
}): string {
  const day = localCalendarYmd(options.now)
  const start = (options.dateStart || '').trim()
  const end = (options.dateEnd || '').trim()
  if (start && end) return `logifi-logbook-${start}-to-${end}.pdf`
  if (start) return `logifi-logbook-from-${start}.pdf`
  if (end) return `logifi-logbook-through-${end}.pdf`
  return `logifi-logbook-${day}.pdf`
}

export async function generatePaperLogbookPdf(
  entries: readonly LogEntry[],
  options: GeneratePaperLogbookPdfOptions = {}
): Promise<Uint8Array> {
  const rowsPerPage = clampRowsPerPage(options.rowsPerPage ?? DEFAULT_ROWS_PER_PAGE)
  const document = paginatePaperLogbook(entries, { ...options, rowsPerPage })
  const pdfLib = await import('pdf-lib')
  const pdf = await pdfLib.PDFDocument.create()
  const font = await pdf.embedFont(pdfLib.StandardFonts.Helvetica)
  const bold = await pdf.embedFont(pdfLib.StandardFonts.HelveticaBold)
  const black = pdfLib.rgb(0, 0, 0)
  const gray = pdfLib.rgb(0.9, 0.9, 0.9)
  const yieldFn = options.yieldFn ?? defaultYield

  const pages = document.pages
  if (pages.length === 0) {
    const empty = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    empty.drawText('No entries in this range.', {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 48,
      size: 12,
      font,
      color: black,
    })
    return pdf.save()
  }

  for (let i = 0; i < pages.length; i++) {
    const paperPage = pages[i]!
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    drawPage(pdfLib, page, font, bold, black, gray, document, paperPage)
    options.onProgress?.(i + 1, pages.length)
    if (i < pages.length - 1) await yieldFn()
  }

  return pdf.save()
}
