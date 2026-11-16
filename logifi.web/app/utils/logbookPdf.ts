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
import { formatEndorsementSignatureBlock } from './endorsementSignature'
import {
  formatFlightSignatureBlock,
  type FlightSignatureDisplay,
} from './flightSignatureDisplay'
import type { BackupEndorsementRecord } from './logbookBackupRecords'
import {
  PDF_CELL_FONT_SIZE,
  PDF_MIN_ROW_HEIGHT,
  PDF_ROW_LINE_HEIGHT,
  PDF_ROW_TEXT_TOP_INSET,
  ROUTE_REMARKS_COLUMN_BASE_WIDTH,
  rowHeightForLineCount,
  wrapTextToLinesWithFont,
} from './logbookPdfText'


export type PaperLogbookPdfSignature = FlightSignatureDisplay & {
  imageBytes?: Uint8Array | null
}

export interface GeneratePaperLogbookPdfOptions extends PaginatePaperLogbookOptions {
  onProgress?: (done: number, total: number) => void
  yieldFn?: () => Promise<void>
  signatures?: PaperLogbookPdfSignature[]
  endorsements?: Array<
    Pick<
      BackupEndorsementRecord,
      | 'title'
      | 'templateCode'
      | 'renderedBody'
      | 'signedAt'
      | 'instructorFullName'
      | 'cfiNumber'
      | 'cfiExpiration'
      | 'status'
      | 'isImported'
    >
  >
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
  { key: 'ident', label: 'Ident', width: 40, align: 'left' },
  { key: 'from', label: 'From', width: 30, align: 'center' },
  { key: 'to', label: 'To', width: 30, align: 'center' },
  { key: 'routeRemarks', label: 'Route / Remarks', width: ROUTE_REMARKS_COLUMN_BASE_WIDTH, align: 'left' },
  { key: 'approaches', label: 'App', width: 22, align: 'right' },
  { key: 'dayLandings', label: 'D Ldg', width: 24, align: 'right' },
  { key: 'nightLandings', label: 'N Ldg', width: 24, align: 'right' },
  { key: 'categoryClass', label: 'Cat', width: 30, align: 'center' },
  { key: 'pic', label: 'PIC', width: 30, align: 'right' },
  { key: 'sic', label: 'SIC', width: 30, align: 'right' },
  { key: 'dualReceived', label: 'Dual R', width: 30, align: 'right' },
  { key: 'dualGiven', label: 'Dual G', width: 30, align: 'right' },
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

function drawMultiLineText(
  page: PDFPage,
  lines: string[],
  font: PDFFont,
  size: number,
  x: number,
  width: number,
  rowBottom: number,
  rowHeight: number,
  color: RGB
): void {
  const pad = 2
  const tx = x + pad
  let baseline =
    rowBottom + rowHeight - PDF_ROW_TEXT_TOP_INSET - size * 0.75
  for (const line of lines) {
    page.drawText(line, { x: tx, y: baseline, size, font, color })
    baseline -= PDF_ROW_LINE_HEIGHT
  }
}

function routeRemarksMaxWidth(routeColWidth: number): number {
  return Math.max(4, routeColWidth - 4)
}

function routeRemarksLines(
  row: PaperLogbookRow | null,
  font: PDFFont,
  routeColWidth: number
): string[] {
  const text = cellText(row, 'routeRemarks', true)
  return wrapTextToLinesWithFont(text, font, PDF_CELL_FONT_SIZE, routeRemarksMaxWidth(routeColWidth))
}

function dataRowHeight(
  slot: PaperLogbookRow | null,
  font: PDFFont,
  routeColWidth: number
): number {
  const lines = routeRemarksLines(slot, font, routeColWidth)
  return rowHeightForLineCount(lines.length)
}

interface PaperDrawContext {
  pdf: PdfLib
  doc: import('pdf-lib').PDFDocument
  page: PDFPage
  font: PDFFont
  bold: PDFFont
  black: RGB
  gray: RGB
  cols: Column[]
  tableWidth: number
  y: number
}

function addLogbookPdfPage(ctx: PaperDrawContext): void {
  ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
}

function drawDocumentBanner(
  ctx: PaperDrawContext,
  docMeta: {
    pilotName: string
    certificateNumber: string
    dateStart: string | null
    dateEnd: string | null
  },
  paperPage: PaperLogbookPage,
  continued: boolean
): void {
  const { page, font, bold, black, tableWidth } = ctx
  let y = PAGE_HEIGHT - MARGIN_TOP
  page.drawText('PILOT LOGBOOK', {
    x: MARGIN_X,
    y: y - 10,
    size: 11,
    font: bold,
    color: black,
  })
  const pageLabel = continued
    ? `Page ${paperPage.pageNumber} of ${paperPage.pageCount} (continued)`
    : `Page ${paperPage.pageNumber} of ${paperPage.pageCount}`
  const pageLabelWidth = font.widthOfTextAtSize(pageLabel, 9)
  page.drawText(pageLabel, {
    x: MARGIN_X + tableWidth - pageLabelWidth,
    y: y - 10,
    size: 9,
    font,
    color: black,
  })
  y -= 22

  if (!continued) {
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
  } else {
    y -= 4
  }
  ctx.y = y
}

function drawCellsRow(
  ctx: PaperDrawContext,
  values: string[],
  height: number,
  options: {
    fill?: RGB
    font?: PDFFont
    size?: number
    labelCols?: number
    routeRemarksLines?: string[]
  }
): void {
  const { page, font, black, cols } = ctx
  const usedFont = options.font ?? font
  const size = options.size ?? PDF_CELL_FONT_SIZE
  let x = MARGIN_X
  const bottom = ctx.y - height
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
      const cellWidth =
        isLabel && i === 0
          ? cols.slice(0, options.labelCols).reduce((s, c) => s + c.width, 0)
          : col.width
      const text = isLabel ? values[0] ?? '' : values[i] ?? ''
      if (col.key === 'routeRemarks' && options.routeRemarksLines) {
        drawMultiLineText(
          page,
          options.routeRemarksLines,
          usedFont,
          size,
          x,
          cellWidth,
          bottom,
          height,
          black
        )
      } else {
        const textY = bottom + height - PDF_ROW_TEXT_TOP_INSET - size * 0.75
        drawAlignedText(page, text, usedFont, size, x, cellWidth, textY, isLabel ? 'left' : col.align, black)
      }
    }
    x += col.width
  }
  ctx.y = bottom
}

function drawSummaryRows(
  ctx: PaperDrawContext,
  summaryValues: (label: string, totals: PaperLogbookTotals) => string[],
  paperPage: PaperLogbookPage
): void {
  const summaryH = PDF_MIN_ROW_HEIGHT
  drawCellsRow(ctx, summaryValues('Totals this page', paperPage.pageTotals), summaryH, {
    fill: ctx.pdf.rgb(0.95, 0.95, 0.95),
    font: ctx.bold,
    labelCols: 6,
  })
  drawCellsRow(ctx, summaryValues('Totals to date', paperPage.totalsToDate), summaryH, {
    fill: ctx.gray,
    font: ctx.bold,
    labelCols: 6,
  })
}

function drawCertificationFooter(ctx: PaperDrawContext): void {
  const { page, font, black } = ctx
  let y = ctx.y - 16
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

function minYForDataRows(ctx: PaperDrawContext): number {
  const summaryBlock = PDF_MIN_ROW_HEIGHT * 2
  const footerBlock = 50
  return MARGIN_BOTTOM + summaryBlock + footerBlock
}

function drawPaperLogbookOnPdf(
  pdf: PdfLib,
  doc: import('pdf-lib').PDFDocument,
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
): number {
  const cols = scaledColumns()
  const tableWidth = cols.reduce((sum, col) => sum + col.width, 0)
  const routeCol = cols.find((c) => c.key === 'routeRemarks')
  const routeColWidth = routeCol?.width ?? 0
  const headerH = 16
  const summaryH = PDF_MIN_ROW_HEIGHT

  const ctx: PaperDrawContext = {
    pdf,
    doc,
    page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    font,
    bold,
    black,
    gray,
    cols,
    tableWidth,
    y: 0,
  }

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

  let pdfPages = 1
  let continued = false

  const startSheet = (includeForwarded: boolean) => {
    drawDocumentBanner(ctx, docMeta, paperPage, continued)
    drawCellsRow(
      ctx,
      cols.map((col) => col.label),
      headerH,
      { fill: gray, font: bold }
    )
    if (includeForwarded) {
      drawCellsRow(ctx, summaryValues('Amount forwarded', paperPage.amountForwarded), summaryH, {
        fill: pdf.rgb(0.95, 0.95, 0.95),
        font: bold,
        labelCols: 6,
      })
    }
  }

  startSheet(true)

  for (const slot of paperPage.slots) {
    const rowHeight = dataRowHeight(slot, font, routeColWidth)
    const minY = minYForDataRows(ctx)
    if (ctx.y - rowHeight < minY) {
      addLogbookPdfPage(ctx)
      pdfPages += 1
      continued = true
      startSheet(false)
    }

    const lines = routeRemarksLines(slot, font, routeColWidth)
    drawCellsRow(ctx, cols.map((col) => cellText(slot, col.key, true)), rowHeight, {
      routeRemarksLines: lines,
    })
  }

  if (ctx.y - PDF_MIN_ROW_HEIGHT * 2 < minYForDataRows(ctx)) {
    addLogbookPdfPage(ctx)
    pdfPages += 1
    continued = true
    startSheet(false)
  }

  drawSummaryRows(ctx, summaryValues, paperPage)
  drawCertificationFooter(ctx)
  return pdfPages
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

async function drawAppendixPages(
  pdfLib: PdfLib,
  doc: import('pdf-lib').PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  black: RGB,
  options: GeneratePaperLogbookPdfOptions,
  entries: readonly LogEntry[]
): Promise<void> {
  const signatures = options.signatures ?? []
  const endorsements = options.endorsements ?? []
  if (signatures.length === 0 && endorsements.length === 0) return

  const byId = new Map(entries.map((entry) => [entry.id, entry]))
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - MARGIN_TOP

  const ensure = (need: number) => {
    if (y - need >= MARGIN_BOTTOM) return
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    y = PAGE_HEIGHT - MARGIN_TOP
  }

  const write = (text: string, size = 9, useBold = false) => {
    ensure(size + 8)
    page.drawText(text.slice(0, 180), {
      x: MARGIN_X,
      y,
      size,
      font: useBold ? bold : font,
      color: black,
    })
    y -= size + 6
  }

  write('Instructor signatures', 12, true)
  if (signatures.length === 0) write('None')
  for (const signature of signatures) {
    const entry = byId.get(signature.logEntryId)
    const flight =
      entry
        ? `${(entry.date || '').slice(0, 10)}  ${entry.departure || '—'} → ${entry.destination || '—'}  ${entry.registration || ''}`
        : signature.logEntryId
    write(flight, 9, true)
    write(formatFlightSignatureBlock(signature), 8)
    if (signature.imageBytes && signature.imageBytes.byteLength > 0) {
      try {
        const image = await doc.embedPng(signature.imageBytes)
        const width = Math.min(180, image.width)
        const height = (image.height / image.width) * width
        ensure(height + 12)
        page.drawImage(image, {
          x: MARGIN_X,
          y: y - height,
          width,
          height,
        })
        y -= height + 10
      } catch {
        write('(signature image not embedded)', 7)
      }
    }
    y -= 6
  }

  y -= 10
  write('Endorsements', 12, true)
  if (endorsements.length === 0) write('None')
  for (const row of endorsements) {
    write(`${(row.signedAt || '').slice(0, 10)}  ${row.templateCode}  ${row.title}`, 9, true)
    write(
      formatEndorsementSignatureBlock({
        signed_at: row.signedAt,
        instructor_full_name: row.instructorFullName,
        cfi_number: row.cfiNumber,
        cfi_expiration: row.cfiExpiration,
        status: row.status,
        is_imported: row.isImported,
      }),
      8
    )
    const body = (row.renderedBody || '').replace(/\s+/g, ' ').trim()
    if (body) write(body.slice(0, 240), 8)
    y -= 6
  }
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
    await drawAppendixPages(pdfLib, pdf, font, bold, black, options, entries)
    return pdf.save()
  }

  for (let i = 0; i < pages.length; i++) {
    const paperPage = pages[i]!
    drawPaperLogbookOnPdf(pdfLib, pdf, font, bold, black, gray, document, paperPage)
    options.onProgress?.(i + 1, pages.length)
    if (i < pages.length - 1) await yieldFn()
  }

  await drawAppendixPages(pdfLib, pdf, font, bold, black, options, entries)
  return pdf.save()
}
