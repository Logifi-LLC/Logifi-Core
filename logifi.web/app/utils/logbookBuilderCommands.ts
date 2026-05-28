export type SelectionRange = {
  startRow: number
  endRow: number
  startCol: number
  endCol: number
}

export type ActiveCell = {
  rowIndex: number
  colIndex: number
}

export function normalizeSelectionRange(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  maxRow: number,
  maxCol: number,
): SelectionRange {
  const top = Math.min(startRow, endRow, maxRow)
  const bottom = Math.max(startRow, endRow)
  const left = Math.min(startCol, endCol, maxCol)
  const right = Math.max(startCol, endCol)
  return {
    startRow: Math.max(0, top),
    endRow: Math.min(maxRow, bottom),
    startCol: Math.max(0, left),
    endCol: Math.min(maxCol, right),
  }
}

export function selectionOrActive(
  selection: SelectionRange | null,
  active: ActiveCell | null,
): SelectionRange | null {
  if (selection) return selection
  if (!active) return null
  return {
    startRow: active.rowIndex,
    endRow: active.rowIndex,
    startCol: active.colIndex,
    endCol: active.colIndex,
  }
}

export function parseTsvMatrix(text: string): string[][] {
  const lines = text.split(/\r?\n/)
  return lines.map((line) => line.split('\t'))
}

export function matrixToTsv(matrix: string[][]): string {
  return matrix
    .map((row) => row.map((v) => v.replace(/\t/g, ' ')).join('\t'))
    .join('\n')
}

export function buildValuesMatrix(
  range: SelectionRange,
  getValue: (row: number, col: number) => string,
): string[][] {
  const values: string[][] = []
  for (let r = range.startRow; r <= range.endRow; r++) {
    const rowVals: string[] = []
    for (let c = range.startCol; c <= range.endCol; c++) {
      rowVals.push(getValue(r, c))
    }
    values.push(rowVals)
  }
  return values
}

export function isCellEmpty(getValue: (row: number, col: number) => string, row: number, col: number): boolean {
  return getValue(row, col).trim() === ''
}

export function findEdgeInDirection(
  startRow: number,
  startCol: number,
  direction: 'up' | 'down' | 'left' | 'right',
  maxRow: number,
  maxCol: number,
  getValue: (row: number, col: number) => string,
): ActiveCell {
  const hasData = (r: number, c: number) => !isCellEmpty(getValue, r, c)

  if (direction === 'left' || direction === 'right') {
    const step = direction === 'left' ? -1 : 1
    let lastDataCol = startCol
    if (hasData(startRow, startCol)) {
      let c = startCol + step
      while (c >= 0 && c <= maxCol) {
        if (hasData(startRow, c)) lastDataCol = c
        else break
        c += step
      }
      return { rowIndex: startRow, colIndex: lastDataCol }
    }
    let c = startCol
    while (c >= 0 && c <= maxCol) {
      if (hasData(startRow, c)) return { rowIndex: startRow, colIndex: c }
      c += step
    }
    return { rowIndex: startRow, colIndex: Math.max(0, Math.min(maxCol, startCol)) }
  }

  const step = direction === 'up' ? -1 : 1
  let lastDataRow = startRow
  if (hasData(startRow, startCol)) {
    let r = startRow + step
    while (r >= 0 && r <= maxRow) {
      if (hasData(r, startCol)) lastDataRow = r
      else break
      r += step
    }
    return { rowIndex: lastDataRow, colIndex: startCol }
  }
  let r = startRow
  while (r >= 0 && r <= maxRow) {
    if (hasData(r, startCol)) return { rowIndex: r, colIndex: startCol }
    r += step
  }
  return { rowIndex: Math.max(0, Math.min(maxRow, startRow)), colIndex: startCol }
}

export function findLastUsedCell(
  maxRow: number,
  maxCol: number,
  getValue: (row: number, col: number) => string,
): ActiveCell {
  for (let r = maxRow; r >= 0; r--) {
    for (let c = maxCol; c >= 0; c--) {
      if (!isCellEmpty(getValue, r, c)) return { rowIndex: r, colIndex: c }
    }
  }
  return { rowIndex: 0, colIndex: 0 }
}

export function fillDownRange(
  range: SelectionRange,
  getValue: (row: number, col: number) => string,
): Array<{ row: number; col: number; value: string }> {
  const updates: Array<{ row: number; col: number; value: string }> = []
  if (range.endRow <= range.startRow) return updates
  for (let c = range.startCol; c <= range.endCol; c++) {
    const source = getValue(range.startRow, c)
    for (let r = range.startRow + 1; r <= range.endRow; r++) {
      updates.push({ row: r, col: c, value: source })
    }
  }
  return updates
}

export function fillRightRange(
  range: SelectionRange,
  getValue: (row: number, col: number) => string,
): Array<{ row: number; col: number; value: string }> {
  const updates: Array<{ row: number; col: number; value: string }> = []
  if (range.endCol <= range.startCol) return updates
  for (let r = range.startRow; r <= range.endRow; r++) {
    const source = getValue(r, range.startCol)
    for (let c = range.startCol + 1; c <= range.endCol; c++) {
      updates.push({ row: r, col: c, value: source })
    }
  }
  return updates
}

export function clearRangeCells(
  range: SelectionRange,
): Array<{ row: number; col: number; value: string }> {
  const updates: Array<{ row: number; col: number; value: string }> = []
  for (let r = range.startRow; r <= range.endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      updates.push({ row: r, col: c, value: '' })
    }
  }
  return updates
}

export function isPrintableKey(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false
  return e.key.length === 1
}

export function isArrowKey(key: string): boolean {
  return key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight'
}
