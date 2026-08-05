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

export function cellInRange(range: SelectionRange, row: number, col: number): boolean {
  return (
    row >= range.startRow &&
    row <= range.endRow &&
    col >= range.startCol &&
    col <= range.endCol
  )
}

/** Translate a selection by deltas, clamping so the full block stays in-bounds. */
export function translateRange(
  source: SelectionRange,
  deltaRow: number,
  deltaCol: number,
  maxRow: number,
  maxCol: number,
): SelectionRange | null {
  const height = source.endRow - source.startRow + 1
  const width = source.endCol - source.startCol + 1
  if (height <= 0 || width <= 0) return null
  if (height > maxRow + 1 || width > maxCol + 1) return null

  const startRow = Math.max(0, Math.min(source.startRow + deltaRow, maxRow - height + 1))
  const startCol = Math.max(0, Math.min(source.startCol + deltaCol, maxCol - width + 1))
  return {
    startRow,
    endRow: startRow + height - 1,
    startCol,
    endCol: startCol + width - 1,
  }
}

export function rangesEqual(a: SelectionRange, b: SelectionRange): boolean {
  return (
    a.startRow === b.startRow &&
    a.endRow === b.endRow &&
    a.startCol === b.startCol &&
    a.endCol === b.endCol
  )
}

/** Copy source values into dest (same shape assumed via offsets from dest origin). */
export function copyRangeUpdates(
  source: SelectionRange,
  dest: SelectionRange,
  getValue: (row: number, col: number) => string,
): Array<{ row: number; col: number; value: string }> {
  const values = buildValuesMatrix(source, getValue)
  const updates: Array<{ row: number; col: number; value: string }> = []
  for (let rOff = 0; rOff < values.length; rOff++) {
    const destRow = dest.startRow + rOff
    if (destRow > dest.endRow) break
    const rowVals = values[rOff] ?? []
    for (let cOff = 0; cOff < rowVals.length; cOff++) {
      const destCol = dest.startCol + cOff
      if (destCol > dest.endCol) break
      updates.push({ row: destRow, col: destCol, value: rowVals[cOff] ?? '' })
    }
  }
  return updates
}

/**
 * Move source into dest: write dest from a snapshot, then clear source cells
 * not covered by dest (safe for overlapping shift-by-one repairs).
 */
export function moveRangeUpdates(
  source: SelectionRange,
  dest: SelectionRange,
  getValue: (row: number, col: number) => string,
): Array<{ row: number; col: number; value: string }> {
  if (rangesEqual(source, dest)) return []
  const updates = copyRangeUpdates(source, dest, getValue)
  for (let r = source.startRow; r <= source.endRow; r++) {
    for (let c = source.startCol; c <= source.endCol; c++) {
      if (!cellInRange(dest, r, c)) {
        updates.push({ row: r, col: c, value: '' })
      }
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
