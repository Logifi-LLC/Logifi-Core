import type { PDFFont } from 'pdf-lib'

export const PDF_CELL_FONT_SIZE = 6.5
export const PDF_MIN_ROW_HEIGHT = 13
export const PDF_ROW_LINE_HEIGHT = 8
export const PDF_ROW_TEXT_TOP_INSET = 3.5

/** Unscaled column width in `logbookPdf` `COLUMNS` (before page scale). */
export const ROUTE_REMARKS_COLUMN_BASE_WIDTH = 108

export function normalizeWrappedText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function joinedLineText(lines: readonly string[]): string {
  return normalizeWrappedText(lines.join(' '))
}

/**
 * Word-wrap with hard breaks for tokens wider than `maxWidth`.
 * `measure` returns glyph width at the PDF cell size.
 */
export function wrapTextToLines(
  text: string,
  maxWidth: number,
  measure: (chunk: string) => number
): string[] {
  const raw = text || ''
  if (!raw) return ['']
  if (maxWidth <= 0) return [raw]

  const lines: string[] = []
  const words = raw.split(/\s+/).filter(Boolean)
  let current = ''

  const pushLongToken = (token: string) => {
    let rest = token
    while (rest.length > 0) {
      if (measure(rest) <= maxWidth) {
        lines.push(rest)
        return
      }
      let fitLen = 0
      for (let i = 1; i <= rest.length; i++) {
        const sub = rest.slice(0, i)
        if (measure(sub) <= maxWidth) fitLen = i
        else break
      }
      if (fitLen === 0) fitLen = 1
      lines.push(rest.slice(0, fitLen))
      rest = rest.slice(fitLen)
    }
  }

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (measure(candidate) <= maxWidth) {
      current = candidate
      continue
    }
    if (current) {
      lines.push(current)
      current = ''
    }
    if (measure(word) <= maxWidth) {
      current = word
    } else {
      pushLongToken(word)
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

export function wrapTextToLinesWithFont(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  return wrapTextToLines(text, maxWidth, (chunk) => font.widthOfTextAtSize(chunk, size))
}

export function rowHeightForLineCount(lineCount: number): number {
  const lines = Math.max(1, lineCount)
  if (lines === 1) return PDF_MIN_ROW_HEIGHT
  return PDF_MIN_ROW_HEIGHT + (lines - 1) * PDF_ROW_LINE_HEIGHT
}