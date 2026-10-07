export interface BuilderValidationError {
  rowIndex: number
  message: string
}

const PIC_TIME_MESSAGE_PREFIX =
  'PIC, Solo, SIC, or Dual Received time is required'

/** Collapse sorted row numbers into "1–5, 8, 10–12". */
export function formatRowNumberList(rows: number[]): string {
  const unique = [...new Set(rows.filter((n) => n >= 0))].sort((a, b) => a - b)
  if (unique.length === 0) return ''

  const parts: string[] = []
  let start = unique[0]!
  let prev = start

  for (let i = 1; i <= unique.length; i++) {
    const next = unique[i]
    if (next === prev + 1) {
      prev = next
      continue
    }
    parts.push(start === prev ? String(start) : `${start}\u2013${prev}`)
    if (next == null) break
    start = next
    prev = next
  }

  return parts.join(', ')
}

function isPicTimeMessage(message: string): boolean {
  return message.startsWith(PIC_TIME_MESSAGE_PREFIX)
}

function shortenRepeatedMessage(message: string): string {
  return message
    .replace(/\s+per 14 CFR Part 61\.51\(b\)/gi, '')
    .replace(/\s+when logging flight time/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function picTimeLine(rows: number[]): string {
  const list = formatRowNumberList(rows)
  if (rows.length === 1) {
    return `Row ${list} needs PIC, SIC, or Dual Received time. Make sure you have all the columns you need.`
  }
  return `Rows ${list} need PIC, SIC, or Dual Received time. Make sure you have all the columns you need.`
}

function repeatedLine(rows: number[], message: string): string {
  const list = formatRowNumberList(rows)
  const short = shortenRepeatedMessage(message)
  if (rows.length === 1) return `Row ${list}: ${short}`
  return `Rows ${list}: ${short}`
}

/**
 * One short line per distinct validation message, with row numbers grouped.
 * Does not change which checks fail — only how they are shown.
 */
export function formatBuilderValidationErrors(errors: BuilderValidationError[]): string[] {
  const globalLines: string[] = []
  const seenGlobal = new Set<string>()
  const grouped = new Map<string, number[]>()
  const order: string[] = []

  for (const error of errors) {
    if (error.rowIndex < 0) {
      if (!seenGlobal.has(error.message)) {
        seenGlobal.add(error.message)
        globalLines.push(error.message)
      }
      continue
    }
    if (!grouped.has(error.message)) {
      grouped.set(error.message, [])
      order.push(error.message)
    }
    grouped.get(error.message)!.push(error.rowIndex)
  }

  const rowLines = order.map((message) => {
    const rows = grouped.get(message) ?? []
    if (isPicTimeMessage(message)) return picTimeLine(rows)
    return repeatedLine(rows, message)
  })

  return [...globalLines, ...rowLines]
}
