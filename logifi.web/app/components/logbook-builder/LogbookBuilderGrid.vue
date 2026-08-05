<script setup lang="ts">
import { ref, inject, computed, onMounted, onUnmounted, nextTick } from 'vue'
import type { Ref } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { DEFAULT_COLUMN_WIDTH, isBuilderSelectField } from '~/utils/logbookBuilderTypes'
import {
  buildValuesMatrix,
  copyRangeUpdates,
  fillDownRange,
  fillRightRange,
  findEdgeInDirection,
  findLastUsedCell,
  isArrowKey,
  isPrintableKey,
  matrixToTsv,
  parseTsvMatrix,
  rangesEqual,
  selectionOrActive,
  translateRange,
  type ActiveCell,
  type SelectionRange,
} from '~/utils/logbookBuilderCommands'
import type { DigifiScanCellMeta } from '~/utils/digifiTypes'
import type { LogbookColumnConfig } from '~/utils/logbookTypes'
import LogbookBuilderCell from './LogbookBuilderCell.vue'
import LogbookBuilderHeader from './LogbookBuilderHeader.vue'
import LogbookBuilderRowTags from './LogbookBuilderRowTags.vue'
import { useTheme } from '~/composables/useTheme'

const grid = inject<ReturnType<typeof useLogbookBuilderGrid>>('logbookBuilderGrid')
if (!grid) throw new Error('LogbookBuilderGrid must be used inside a page that provides logbookBuilderGrid')
const {
  visibleColumns,
  rows,
  setCell,
  setRowTags,
  updateColumn,
  reorderColumns,
  layout,
  effectiveSplitIndex,
  setTwoPageSplitIndex,
  tagsColumnWidth,
  setColumnWidth,
  setTagsColumnWidth,
  MIN_COLUMN_WIDTH,
  MAX_COLUMN_WIDTH,
  activeRowIndex,
  setActiveRowIndex,
  noteDigifiCellManualEdit,
  setDigifiCellMeta,
  pushUndoSnapshot,
  undo,
  redo,
} = grid

const builderPilots = inject<Ref<string[]> | null>('builderPilots', null)

const { isDark } = useTheme()

const draggedColumnId = ref<string | null>(null)

type GridMode = 'navigate' | 'edit'

type DragFillState = {
  mode: 'single' | 'block'
  startRow?: number
  startCol?: number
  currentRow?: number
  currentCol?: number
  baseRange?: SelectionRange
  previewDestRange?: SelectionRange | null
  isDragging: boolean
}

type DragMoveState = {
  baseRange: SelectionRange
  previewDestRange: SelectionRange | null
  originCell: ActiveCell
  copy: boolean
  isDragging: boolean
}

type ClipboardPayload = {
  width: number
  height: number
  values: string[][]
  /** Parallel to values; present for in-app cut/copy so Digifi tints can follow paste. */
  meta?: (DigifiScanCellMeta | null)[][]
}

type CellMutation = {
  row: number
  col: number
  value?: string
  /** undefined = leave meta alone; null = clear */
  meta?: DigifiScanCellMeta | null
  noteManualEdit?: boolean
}

const activeCell = ref<ActiveCell | null>(null)
const activeSelection = ref<SelectionRange | null>(null)
const dragFill = ref<DragFillState | null>(null)
const dragMove = ref<DragMoveState | null>(null)
const clipboard = ref<ClipboardPayload | null>(null)
const isDraggingSelection = ref(false)
const selectionAnchor = ref<ActiveCell | null>(null)
const gridMode = ref<GridMode>('navigate')
const editSnapshot = ref<string | null>(null)
const editingCell = ref<ActiveCell | null>(null)

function onHeaderDragStart(colId: string, e: DragEvent) {
  if (!e.dataTransfer) return
  draggedColumnId.value = colId
  e.dataTransfer.setData('text/plain', colId)
  e.dataTransfer.effectAllowed = 'move'
}

function onHeaderDragEnd() {
  draggedColumnId.value = null
}

function handleHeaderDrop(targetColId: string) {
  const draggedId = draggedColumnId.value
  if (!draggedId || draggedId === targetColId) {
    draggedColumnId.value = null
    return
  }
  const ids = visibleColumns.value.map((c) => c.id)
  const fromIdx = ids.indexOf(draggedId)
  const toIdx = ids.indexOf(targetColId)
  if (fromIdx === -1 || toIdx === -1) {
    draggedColumnId.value = null
    return
  }
  const reordered = [...ids]
  reordered.splice(fromIdx, 1)
  reordered.splice(toIdx, 0, draggedId)
  reorderColumns(reordered)
  draggedColumnId.value = null
}

function getColumnStyle(col: { width?: number }) {
  const w = col.width ?? DEFAULT_COLUMN_WIDTH
  return { width: `${w}px`, minWidth: `${w}px` }
}

function isCellInSelection(rowIdx: number, colIdx: number): boolean {
  const range = activeSelection.value
  if (!range) return false
  return (
    rowIdx >= range.startRow &&
    rowIdx <= range.endRow &&
    colIdx >= range.startCol &&
    colIdx <= range.endCol
  )
}

function isActiveCell(rowIdx: number, colIdx: number): boolean {
  const cell = activeCell.value
  if (!cell) return false
  return cell.rowIndex === rowIdx && cell.colIndex === colIdx
}

function isHandleCell(rowIdx: number, colIdx: number): boolean {
  const range = activeSelection.value
  if (range) {
    return rowIdx === range.endRow && colIdx === range.endCol
  }
  return isActiveCell(rowIdx, colIdx)
}

function clampRowCol(rowIdx: number, colIdx: number): { rowIndex: number; colIndex: number } {
  const maxRow = Math.max(0, rows.value.length - 1)
  const maxCol = Math.max(0, visibleColumns.value.length - 1)
  return {
    rowIndex: Math.min(Math.max(0, rowIdx), maxRow),
    colIndex: Math.min(Math.max(0, colIdx), maxCol),
  }
}

function makeSelectionRange(startRow: number, startCol: number, endRow: number, endCol: number): SelectionRange {
  const clampedStart = clampRowCol(startRow, startCol)
  const clampedEnd = clampRowCol(endRow, endCol)
  const top = Math.min(clampedStart.rowIndex, clampedEnd.rowIndex)
  const bottom = Math.max(clampedStart.rowIndex, clampedEnd.rowIndex)
  const left = Math.min(clampedStart.colIndex, clampedEnd.colIndex)
  const right = Math.max(clampedStart.colIndex, clampedEnd.colIndex)
  return {
    startRow: top,
    endRow: bottom,
    startCol: left,
    endCol: right,
  }
}

function unionRanges(a: SelectionRange, b: SelectionRange): SelectionRange {
  return {
    startRow: Math.min(a.startRow, b.startRow),
    endRow: Math.max(a.endRow, b.endRow),
    startCol: Math.min(a.startCol, b.startCol),
    endCol: Math.max(a.endCol, b.endCol),
  }
}

function setSelectionFromAnchor(anchor: ActiveCell, focus: ActiveCell) {
  selectionAnchor.value = anchor
  activeSelection.value = makeSelectionRange(
    anchor.rowIndex,
    anchor.colIndex,
    focus.rowIndex,
    focus.colIndex,
  )
  activeCell.value = clampRowCol(focus.rowIndex, focus.colIndex)
}

function isSelectionTopEdge(rowIdx: number, colIdx: number): boolean {
  const sel = activeSelection.value
  if (!sel) return false
  return rowIdx === sel.startRow && colIdx >= sel.startCol && colIdx <= sel.endCol
}

function isSelectionBottomEdge(rowIdx: number, colIdx: number): boolean {
  const sel = activeSelection.value
  if (!sel) return false
  return rowIdx === sel.endRow && colIdx >= sel.startCol && colIdx <= sel.endCol
}

function isSelectionLeftEdge(rowIdx: number, colIdx: number): boolean {
  const sel = activeSelection.value
  if (!sel) return false
  return colIdx === sel.startCol && rowIdx >= sel.startRow && rowIdx <= sel.endRow
}

function isSelectionRightEdge(rowIdx: number, colIdx: number): boolean {
  const sel = activeSelection.value
  if (!sel) return false
  return colIdx === sel.endCol && rowIdx >= sel.startRow && rowIdx <= sel.endRow
}

function cloneDigifiMeta(meta: DigifiScanCellMeta | null | undefined): DigifiScanCellMeta | null {
  if (!meta) return null
  return {
    ...meta,
    candidates: meta.candidates?.map((c) => ({ ...c })),
  }
}

function getMetaAt(rowIdx: number, colIdx: number): DigifiScanCellMeta | null {
  const col = visibleColumns.value[colIdx]
  if (!col) return null
  return cloneDigifiMeta(rows.value[rowIdx]?.digifiCellMeta?.[col.id] ?? null)
}

function buildMetaMatrix(range: SelectionRange): (DigifiScanCellMeta | null)[][] {
  const matrix: (DigifiScanCellMeta | null)[][] = []
  for (let r = range.startRow; r <= range.endRow; r++) {
    const rowMeta: (DigifiScanCellMeta | null)[] = []
    for (let c = range.startCol; c <= range.endCol; c++) {
      rowMeta.push(getMetaAt(r, c))
    }
    matrix.push(rowMeta)
  }
  return matrix
}

function applyFillFromActiveToRange(range: SelectionRange, source: ActiveCell | null) {
  if (!source) return
  const cols = visibleColumns.value
  const sourceCol = cols[source.colIndex]
  if (!sourceCol) return
  const sourceRow = rows.value[source.rowIndex]
  if (!sourceRow?.cells) return
  const sourceValue = sourceRow.cells[sourceCol.id] ?? ''

  const mutations: CellMutation[] = []
  for (let r = range.startRow; r <= range.endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      if (r === source.rowIndex && c === source.colIndex) continue
      mutations.push({ row: r, col: c, value: sourceValue, noteManualEdit: true })
    }
  }
  applyGridMutations(mutations)
}

function applyBlockCopy(base: SelectionRange, dest: SelectionRange) {
  applyGridMutations(
    copyRangeUpdates(base, dest, getValueAt).map((u) => ({
      ...u,
      noteManualEdit: true,
    })),
  )
}

/** Move (default) or copy a block. Move relocates digifiCellMeta; copy does not. */
function applyBlockMove(source: SelectionRange, dest: SelectionRange, copy: boolean) {
  if (rangesEqual(source, dest)) return

  const values = buildValuesMatrix(source, getValueAt)
  const metaMatrix = copy ? null : buildMetaMatrix(source)
  const mutations: CellMutation[] = []

  for (let rOff = 0; rOff < values.length; rOff++) {
    const destRow = dest.startRow + rOff
    if (destRow > dest.endRow) break
    const rowVals = values[rOff] ?? []
    for (let cOff = 0; cOff < rowVals.length; cOff++) {
      const destCol = dest.startCol + cOff
      if (destCol > dest.endCol) break
      if (copy) {
        mutations.push({
          row: destRow,
          col: destCol,
          value: rowVals[cOff] ?? '',
          noteManualEdit: true,
        })
      } else {
        mutations.push({
          row: destRow,
          col: destCol,
          value: rowVals[cOff] ?? '',
          meta: cloneDigifiMeta(metaMatrix?.[rOff]?.[cOff] ?? null),
        })
      }
    }
  }

  if (!copy) {
    for (let r = source.startRow; r <= source.endRow; r++) {
      for (let c = source.startCol; c <= source.endCol; c++) {
        if (
          r < dest.startRow ||
          r > dest.endRow ||
          c < dest.startCol ||
          c > dest.endCol
        ) {
          mutations.push({ row: r, col: c, value: '', meta: null })
        }
      }
    }
  }

  applyGridMutations(mutations)
}

function computeDestRange(base: SelectionRange, target: ActiveCell): SelectionRange | null {
  const width = base.endCol - base.startCol + 1
  const height = base.endRow - base.startRow + 1
  if (width <= 0 || height <= 0) return null

  const maxRow = Math.max(0, rows.value.length - 1)
  const maxCol = Math.max(0, visibleColumns.value.length - 1)

  // Horizontal drag (right/left of the block)
  if (target.colIndex > base.endCol) {
    let startCol = base.endCol + 1
    let endCol = startCol + width - 1
    if (startCol > maxCol) return null
    if (endCol > maxCol) endCol = maxCol
    return {
      startRow: base.startRow,
      endRow: base.endRow,
      startCol,
      endCol,
    }
  }
  if (target.colIndex < base.startCol) {
    let endCol = base.startCol - 1
    let startCol = endCol - (width - 1)
    if (endCol < 0) return null
    if (startCol < 0) startCol = 0
    return {
      startRow: base.startRow,
      endRow: base.endRow,
      startCol,
      endCol,
    }
  }

  // Vertical drag (below/above the block)
  if (target.rowIndex > base.endRow) {
    let startRow = base.endRow + 1
    let endRow = startRow + height - 1
    if (startRow > maxRow) return null
    if (endRow > maxRow) endRow = maxRow
    return {
      startRow,
      endRow,
      startCol: base.startCol,
      endCol: base.endCol,
    }
  }
  if (target.rowIndex < base.startRow) {
    let endRow = base.startRow - 1
    let startRow = endRow - (height - 1)
    if (endRow < 0) return null
    if (startRow < 0) startRow = 0
    return {
      startRow,
      endRow,
      startCol: base.startCol,
      endCol: base.endCol,
    }
  }

  // Pointer is within or aligned with the block edges: no destination.
  return null
}

function isCellEditing(rowIdx: number, colIdx: number): boolean {
  const ec = editingCell.value
  return gridMode.value === 'edit' && ec?.rowIndex === rowIdx && ec?.colIndex === colIdx
}

function isEventInGrid(target: EventTarget | null): boolean {
  if (!target || !gridContainerRef.value) return false
  return gridContainerRef.value.contains(target as Node)
}

function getValueAt(rowIdx: number, colIdx: number): string {
  const col = visibleColumns.value[colIdx]
  if (!col) return ''
  return getCellValue(rowIdx, col.id)
}

function getCommandSelection(): SelectionRange {
  const maxRow = Math.max(0, rows.value.length - 1)
  const maxCol = Math.max(0, visibleColumns.value.length - 1)
  const base = selectionOrActive(activeSelection.value, activeCell.value)
  if (!base) {
    return { startRow: 0, endRow: 0, startCol: 0, endCol: maxCol }
  }
  return {
    startRow: Math.min(base.startRow, maxRow),
    endRow: Math.min(base.endRow, maxRow),
    startCol: Math.min(base.startCol, maxCol),
    endCol: Math.min(base.endCol, maxCol),
  }
}

function enterNavigateMode() {
  gridMode.value = 'navigate'
  editingCell.value = null
  editSnapshot.value = null
}

function focusGridContainer() {
  gridContainerRef.value?.focus()
}

function isSelectColumn(colIdx: number): boolean {
  const col = visibleColumns.value[colIdx]
  return col ? isBuilderSelectField(col) : false
}

function isActiveSelectColumn(): boolean {
  const focus = activeCell.value
  return focus != null && isSelectColumn(focus.colIndex)
}

/** Select/pilots open editors on click; plain text uses navigate + drag-select. */
function isClickToEditColumn(col: LogbookColumnConfig | undefined): boolean {
  if (!col) return false
  if (isBuilderSelectField(col)) return true
  if (col.fieldKey === 'pilots') return true
  return false
}

function isGridChromeMouseTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  return (
    target.closest('thead') != null ||
    target.closest('[aria-label="Drag to fill"]') != null ||
    target.closest('[aria-label="Drag to move"]') != null ||
    target.closest('.cursor-col-resize') != null
  )
}

function scrollActiveCellIntoView() {
  void nextTick(() => {
    const cell = activeCell.value
    const container = gridContainerRef.value
    if (!cell || !container) return
    const el = container.querySelector(
      `[data-builder-row="${cell.rowIndex}"][data-builder-col="${cell.colIndex}"]`,
    )
    const td = el?.closest('td')
    td?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })
}

function editingCellDefersKeydown(e: KeyboardEvent): boolean {
  const ec = editingCell.value
  if (!ec) return false
  const col = visibleColumns.value[ec.colIndex]
  if (!col) return false
  const cellEl = cellRefs.value.get(cellKey(ec.rowIndex, col.id))
  return cellEl?.shouldDeferGridKeydown?.(e) ?? false
}

function onCellDropdownCommit() {
  commitAndExitEdit()
  moveEnter(false)
}

async function startEdit(
  rowIdx: number,
  colIdx: number,
  options: { overwrite: boolean; initialChar?: string },
) {
  const col = visibleColumns.value[colIdx]
  if (!col) return
  const cell = clampRowCol(rowIdx, colIdx)
  const sameCell =
    editingCell.value?.rowIndex === cell.rowIndex &&
    editingCell.value?.colIndex === cell.colIndex
  if (!sameCell) {
    pushUndoSnapshot()
  }
  editSnapshot.value = getCellValue(cell.rowIndex, col.id)
  gridMode.value = 'edit'
  editingCell.value = cell
  activeCell.value = cell
  setSelectionFromAnchor(cell, cell)
  setActiveRowIndex(cell.rowIndex)
  scrollActiveCellIntoView()
  await nextTick()
  const el = cellRefs.value.get(cellKey(cell.rowIndex, col.id))
  const beginOverwrite =
    options.initialChar != null ? false : options.overwrite
  el?.beginEdit?.({ overwrite: beginOverwrite })
  if (options.initialChar != null) {
    onCellInput(cell.rowIndex, col.id, options.initialChar)
  }
}

function commitAndExitEdit() {
  const ec = editingCell.value
  if (ec) {
    const col = visibleColumns.value[ec.colIndex]
    if (col) {
      const el = cellRefs.value.get(cellKey(ec.rowIndex, col.id))
      el?.commitEdit?.()
    }
  }
  enterNavigateMode()
}

function cancelEdit() {
  const ec = editingCell.value
  if (ec != null && editSnapshot.value != null) {
    const col = visibleColumns.value[ec.colIndex]
    if (col) {
      setCell(ec.rowIndex, col.id, editSnapshot.value)
      const el = cellRefs.value.get(cellKey(ec.rowIndex, col.id))
      el?.cancelEdit?.(editSnapshot.value)
    }
  }
  enterNavigateMode()
}

function navigateToCell(rowIdx: number, colIdx: number, extend = false) {
  const cell = clampRowCol(rowIdx, colIdx)
  if (extend) {
    const anchor = selectionAnchor.value ?? activeCell.value ?? cell
    setSelectionFromAnchor(anchor, cell)
  } else {
    setSelectionFromAnchor(cell, cell)
  }
  setActiveRowIndex(cell.rowIndex)
  if (gridMode.value === 'navigate') {
    focusGridContainer()
  }
  scrollActiveCellIntoView()
}

function moveSelectionByDelta(deltaRow: number, deltaCol: number, extend: boolean) {
  const focus = activeCell.value ?? { rowIndex: 0, colIndex: 0 }
  navigateToCell(focus.rowIndex + deltaRow, focus.colIndex + deltaCol, extend)
}

function moveTab(shift: boolean) {
  const rowsCount = rows.value.length
  const colsCount = visibleColumns.value.length
  if (!rowsCount || !colsCount) return
  let { rowIndex, colIndex } = activeCell.value ?? { rowIndex: 0, colIndex: 0 }
  if (shift) {
    if (colIndex > 0) colIndex--
    else if (rowIndex > 0) {
      rowIndex--
      colIndex = colsCount - 1
    }
  } else {
    if (colIndex < colsCount - 1) colIndex++
    else if (rowIndex < rowsCount - 1) {
      rowIndex++
      colIndex = 0
    }
  }
  navigateToCell(rowIndex, colIndex, false)
}

function moveEnter(shift: boolean) {
  const rowsCount = rows.value.length
  const colsCount = visibleColumns.value.length
  if (!rowsCount || !colsCount) return
  const focus = activeCell.value ?? { rowIndex: 0, colIndex: 0 }
  const nextRow = shift ? focus.rowIndex - 1 : focus.rowIndex + 1
  if (nextRow < 0 || nextRow >= rowsCount) return
  navigateToCell(nextRow, focus.colIndex, false)
}

function applyGridMutations(mutations: CellMutation[]) {
  if (mutations.length === 0) return
  pushUndoSnapshot()
  for (const m of mutations) {
    const colDef = visibleColumns.value[m.col]
    if (!colDef) continue
    if (m.value !== undefined) {
      setCell(m.row, colDef.id, m.value)
      if (m.noteManualEdit) noteDigifiCellManualEdit(m.row, colDef.id, m.value)
    }
    if (m.meta !== undefined) {
      setDigifiCellMeta(m.row, colDef.id, m.meta)
    }
  }
}

function applyCellUpdates(updates: Array<{ row: number; col: number; value: string }>) {
  applyGridMutations(
    updates.map((u) => ({
      row: u.row,
      col: u.col,
      value: u.value,
      noteManualEdit: true,
    })),
  )
}

function clearRangeWithMeta(range: SelectionRange) {
  const mutations: CellMutation[] = []
  for (let r = range.startRow; r <= range.endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      mutations.push({ row: r, col: c, value: '', meta: null })
    }
  }
  applyGridMutations(mutations)
}

function copySelection(cut: boolean) {
  const range = getCommandSelection()
  const values = buildValuesMatrix(range, getValueAt)
  const meta = buildMetaMatrix(range)
  clipboard.value = {
    width: range.endCol - range.startCol + 1,
    height: range.endRow - range.startRow + 1,
    values,
    meta,
  }
  const tsv = matrixToTsv(values)
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(tsv).catch(() => {})
  }
  if (cut) {
    clearRangeWithMeta(range)
  }
}

function pasteAtActiveCell() {
  const anchor = activeCell.value ?? { rowIndex: 0, colIndex: 0 }

  const applyMatrix = (
    matrix: string[][],
    metaMatrix?: (DigifiScanCellMeta | null)[][] | null,
  ) => {
    if (!matrix.length) return
    const maxRow = rows.value.length - 1
    const maxCol = visibleColumns.value.length - 1
    const mutations: CellMutation[] = []
    for (let rOff = 0; rOff < matrix.length; rOff++) {
      const destRow = anchor.rowIndex + rOff
      if (destRow > maxRow) break
      const rowVals = matrix[rOff] ?? []
      for (let cOff = 0; cOff < rowVals.length; cOff++) {
        const destCol = anchor.colIndex + cOff
        if (destCol > maxCol) break
        const value = rowVals[cOff] ?? ''
        if (metaMatrix) {
          mutations.push({
            row: destRow,
            col: destCol,
            value,
            meta: cloneDigifiMeta(metaMatrix[rOff]?.[cOff] ?? null),
          })
        } else {
          mutations.push({ row: destRow, col: destCol, value, noteManualEdit: true })
        }
      }
    }
    applyGridMutations(mutations)
  }

  const applyInternalClipboard = () => {
    if (!clipboard.value) return
    applyMatrix(clipboard.value.values, clipboard.value.meta ?? null)
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
    navigator.clipboard
      .readText()
      .then((text) => {
        const matrix = parseTsvMatrix(text)
        const hasTsv = matrix.length > 0 && (matrix[0]?.length ?? 0) > 0
        if (hasTsv && clipboard.value) {
          // Prefer in-memory payload (with Digifi meta) when TSV matches our last copy/cut.
          const sameAsInternal = matrixToTsv(clipboard.value.values) === matrixToTsv(matrix)
          if (sameAsInternal && clipboard.value.meta) {
            applyMatrix(clipboard.value.values, clipboard.value.meta)
            return
          }
        }
        if (hasTsv) {
          applyMatrix(matrix)
        } else {
          applyInternalClipboard()
        }
      })
      .catch(() => {
        applyInternalClipboard()
      })
  } else {
    applyInternalClipboard()
  }
}

function clearCommandSelection() {
  clearRangeWithMeta(getCommandSelection())
}

function onCellFocus(rowIdx: number, colIdx: number) {
  if (gridMode.value !== 'edit') return
  activeCell.value = clampRowCol(rowIdx, colIdx)
  setActiveRowIndex(rowIdx)
}

function onCellBlur() {
  if (gridMode.value === 'edit') return
  setActiveRowIndex(null)
}

function findCellFromPoint(clientX: number, clientY: number): ActiveCell | null {
  const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null
  if (!el) return null
  let node: HTMLElement | null = el
  while (node) {
    const dataset = (node as HTMLElement).dataset
    if (dataset && dataset.builderRow != null && dataset.builderCol != null) {
      const row = parseInt(dataset.builderRow, 10)
      const col = parseInt(dataset.builderCol, 10)
      if (!Number.isNaN(row) && !Number.isNaN(col)) {
        return clampRowCol(row, col)
      }
    }
    node = node.parentElement
  }
  return null
}

function getCellFromEvent(event: MouseEvent): ActiveCell | null {
  let node = event.target as HTMLElement | null
  while (node) {
    const dataset = (node as HTMLElement).dataset
    if (dataset && dataset.builderRow != null && dataset.builderCol != null) {
      const row = parseInt(dataset.builderRow, 10)
      const col = parseInt(dataset.builderCol, 10)
      if (!Number.isNaN(row) && !Number.isNaN(col)) {
        return clampRowCol(row, col)
      }
    }
    node = node.parentElement
  }
  return null
}

function onGridMouseDown(event: MouseEvent) {
  if (event.button !== 0) return
  if (isGridChromeMouseTarget(event.target)) return

  const cellFromEvent = getCellFromEvent(event)
  const cell = cellFromEvent ?? findCellFromPoint(event.clientX, event.clientY)
  if (!cell) return

  const col = visibleColumns.value[cell.colIndex]

  if (isClickToEditColumn(col)) {
    if (
      gridMode.value === 'edit' &&
      editingCell.value &&
      (editingCell.value.rowIndex !== cell.rowIndex ||
        editingCell.value.colIndex !== cell.colIndex)
    ) {
      commitAndExitEdit()
    }
    if (event.shiftKey) {
      const anchor = selectionAnchor.value ?? activeCell.value ?? cell
      setSelectionFromAnchor(anchor, cell)
      setActiveRowIndex(anchor.rowIndex)
    } else {
      setSelectionFromAnchor(cell, cell)
      setActiveRowIndex(cell.rowIndex)
    }
    void startEdit(cell.rowIndex, cell.colIndex, { overwrite: false })
    return
  }

  event.preventDefault()

  if (gridMode.value === 'edit') {
    commitAndExitEdit()
  }

  if (event.shiftKey) {
    const anchor = selectionAnchor.value ?? activeCell.value ?? cell
    setSelectionFromAnchor(anchor, cell)
    setActiveRowIndex(anchor.rowIndex)
  } else {
    setSelectionFromAnchor(cell, cell)
    setActiveRowIndex(cell.rowIndex)
  }

  enterNavigateMode()
  focusGridContainer()

  isDraggingSelection.value = true

  const handleSelectionMove = (e: MouseEvent) => {
    if (!isDraggingSelection.value || !selectionAnchor.value) return
    const nextCell = findCellFromPoint(e.clientX, e.clientY)
    if (!nextCell) return
    setSelectionFromAnchor(selectionAnchor.value, nextCell)
  }

  const handleSelectionUp = () => {
    isDraggingSelection.value = false
    document.removeEventListener('mousemove', handleSelectionMove)
    document.removeEventListener('mouseup', handleSelectionUp)
  }

  document.addEventListener('mousemove', handleSelectionMove)
  document.addEventListener('mouseup', handleSelectionUp)
}

function onFillHandleMouseDown(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  if (!activeCell.value && !activeSelection.value) return

  const base: SelectionRange | null =
    activeSelection.value ??
    (activeCell.value
      ? {
          startRow: activeCell.value.rowIndex,
          endRow: activeCell.value.rowIndex,
          startCol: activeCell.value.colIndex,
          endCol: activeCell.value.colIndex,
        }
      : null)

  if (!base) return

  const isSingleCellBase = base.startRow === base.endRow && base.startCol === base.endCol

  if (isSingleCellBase) {
    const start = clampRowCol(base.startRow, base.startCol)
    dragFill.value = {
      mode: 'single',
      startRow: start.rowIndex,
      startCol: start.colIndex,
      currentRow: start.rowIndex,
      currentCol: start.colIndex,
      isDragging: true,
    }
    // For single-cell drag, selection will be updated during drag.
  } else {
    dragFill.value = {
      mode: 'block',
      baseRange: base,
      previewDestRange: null,
      isDragging: true,
    }
    // Ensure the original block stays highlighted while dragging.
    activeSelection.value = base
  }

  const handleMouseMove = (e: MouseEvent) => {
    const state = dragFill.value
    if (!state || !state.isDragging) return

    const cell = findCellFromPoint(e.clientX, e.clientY)

    if (state.mode === 'single') {
      if (!cell) return
      state.currentRow = cell.rowIndex
      state.currentCol = cell.colIndex
      activeSelection.value = makeSelectionRange(
        state.startRow as number,
        state.startCol as number,
        state.currentRow as number,
        state.currentCol as number,
      )
      return
    }

    // Block mode
    const baseRange = state.baseRange
    if (!baseRange) return

    if (!cell) {
      state.previewDestRange = null
      activeSelection.value = baseRange
      return
    }

    const dest = computeDestRange(baseRange, cell)
    state.previewDestRange = dest
    activeSelection.value = dest ? unionRanges(baseRange, dest) : baseRange
  }

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)

    const state = dragFill.value
    dragFill.value = null
    if (!state || !state.isDragging) return

    if (state.mode === 'single') {
      const range = activeSelection.value
      const source = activeCell.value
      if (!range || !source) {
        activeSelection.value = null
        return
      }

      const singleCell =
        range.startRow === range.endRow &&
        range.startCol === range.endCol &&
        range.startRow === source.rowIndex &&
        range.startCol === source.colIndex

      if (singleCell) {
        activeSelection.value = null
        return
      }

      applyFillFromActiveToRange(range, source)
    } else {
      const baseRange = state.baseRange
      const destRange = state.previewDestRange
      if (!baseRange || !destRange) {
        activeSelection.value = baseRange ?? null
        return
      }
      applyBlockCopy(baseRange, destRange)
      activeSelection.value = unionRanges(baseRange, destRange)
    }
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

/** Drag selection border to move (Cmd/Ctrl = copy). Dest is a translated block. */
function onSelectionBorderMouseDown(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  if (gridMode.value === 'edit') commitAndExitEdit()

  const base = getCommandSelection()
  const origin = findCellFromPoint(event.clientX, event.clientY) ?? activeCell.value
  if (!origin) return

  dragMove.value = {
    baseRange: base,
    previewDestRange: base,
    originCell: origin,
    copy: event.metaKey || event.ctrlKey,
    isDragging: true,
  }
  activeSelection.value = base
  enterNavigateMode()
  focusGridContainer()
  document.body.style.cursor = dragMove.value.copy ? 'copy' : 'move'
  document.body.style.userSelect = 'none'

  const handleMouseMove = (e: MouseEvent) => {
    const state = dragMove.value
    if (!state || !state.isDragging) return
    const cell = findCellFromPoint(e.clientX, e.clientY)
    if (!cell) return
    const maxRow = Math.max(0, rows.value.length - 1)
    const maxCol = Math.max(0, visibleColumns.value.length - 1)
    const deltaRow = cell.rowIndex - state.originCell.rowIndex
    const deltaCol = cell.colIndex - state.originCell.colIndex
    const dest = translateRange(state.baseRange, deltaRow, deltaCol, maxRow, maxCol)
    state.previewDestRange = dest
    if (dest) {
      activeSelection.value = state.copy
        ? unionRanges(state.baseRange, dest)
        : dest
    } else {
      activeSelection.value = state.baseRange
    }
  }

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    const state = dragMove.value
    dragMove.value = null
    if (!state || !state.isDragging) return

    const dest = state.previewDestRange
    if (!dest || rangesEqual(state.baseRange, dest)) {
      activeSelection.value = state.baseRange
      activeCell.value = {
        rowIndex: state.baseRange.startRow,
        colIndex: state.baseRange.startCol,
      }
      selectionAnchor.value = activeCell.value
      return
    }

    applyBlockMove(state.baseRange, dest, state.copy)
    activeSelection.value = dest
    activeCell.value = { rowIndex: dest.startRow, colIndex: dest.startCol }
    selectionAnchor.value = activeCell.value
    setActiveRowIndex(dest.startRow)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

function shouldExitEditOnHorizontalArrow(key: string, input: HTMLInputElement): boolean {
  const start = input.selectionStart ?? 0
  const end = input.selectionEnd ?? 0
  if (start !== end) return true
  const len = input.value.length
  if (key === 'ArrowLeft') return start === 0
  if (key === 'ArrowRight') return start === len
  return false
}

function handleKeyDown(e: KeyboardEvent) {
  const inGrid =
    isEventInGrid(e.target) ||
    document.activeElement === gridContainerRef.value
  if (!inGrid) return

  const keyRaw = e.key
  const key = keyRaw.toLowerCase()
  const isMeta = e.metaKey || e.ctrlKey
  const maxRow = Math.max(0, rows.value.length - 1)
  const maxCol = Math.max(0, visibleColumns.value.length - 1)

  if (!activeCell.value && rows.value.length > 0) {
    activeCell.value = { rowIndex: 0, colIndex: 0 }
    activeSelection.value = makeSelectionRange(0, 0, 0, 0)
  }

  if (isMeta && key === 'z') {
    e.preventDefault()
    if (gridMode.value === 'edit') {
      cancelEdit()
    }
    if (e.shiftKey) {
      redo()
    } else {
      undo()
    }
    enterNavigateMode()
    focusGridContainer()
    return
  }

  if (isMeta && key === 'y') {
    e.preventDefault()
    if (gridMode.value === 'edit') {
      cancelEdit()
    }
    redo()
    enterNavigateMode()
    focusGridContainer()
    return
  }

  if (gridMode.value === 'edit') {
    const ec = editingCell.value
    if (!ec) {
      enterNavigateMode()
      return
    }

    if (keyRaw === 'Escape') {
      e.preventDefault()
      cancelEdit()
      focusGridContainer()
      return
    }

    if (editingCellDefersKeydown(e)) {
      return
    }

    if (keyRaw === 'Enter') {
      e.preventDefault()
      commitAndExitEdit()
      moveEnter(e.shiftKey)
      return
    }

    if (keyRaw === 'Tab') {
      e.preventDefault()
      commitAndExitEdit()
      moveTab(e.shiftKey)
      return
    }

    if (keyRaw === 'F2' && !isMeta && !e.altKey) {
      e.preventDefault()
      return
    }

    if (!isMeta && !e.altKey && isArrowKey(keyRaw)) {
      const col = visibleColumns.value[ec.colIndex]
      const cellEl = col ? cellRefs.value.get(cellKey(ec.rowIndex, col.id)) : null
      const input = cellEl?.getInputElement?.() ?? null

      if (keyRaw === 'ArrowUp' || keyRaw === 'ArrowDown') {
        e.preventDefault()
        commitAndExitEdit()
        moveSelectionByDelta(keyRaw === 'ArrowUp' ? -1 : 1, 0, e.shiftKey)
        return
      }

      if (input && !shouldExitEditOnHorizontalArrow(keyRaw, input)) {
        return
      }

      e.preventDefault()
      commitAndExitEdit()
      const deltaCol = keyRaw === 'ArrowLeft' ? -1 : 1
      moveSelectionByDelta(0, deltaCol, e.shiftKey)
      return
    }

    return
  }

  // Navigate mode
  if (keyRaw === 'F2' && !isMeta && !e.altKey) {
    e.preventDefault()
    const focus = activeCell.value ?? { rowIndex: 0, colIndex: 0 }
    startEdit(focus.rowIndex, focus.colIndex, { overwrite: false })
    return
  }

  if (keyRaw === 'Escape') {
    e.preventDefault()
    enterNavigateMode()
    return
  }

  if ((keyRaw === 'Delete' || keyRaw === 'Backspace') && !isMeta) {
    e.preventDefault()
    clearCommandSelection()
    return
  }

  if (isMeta) {
    if (key === 'c') {
      e.preventDefault()
      copySelection(false)
      return
    }
    if (key === 'x') {
      e.preventDefault()
      copySelection(true)
      return
    }
    if (key === 'v') {
      e.preventDefault()
      pasteAtActiveCell()
      return
    }
    if (key === 'd') {
      e.preventDefault()
      applyCellUpdates(fillDownRange(getCommandSelection(), getValueAt))
      return
    }
    if (key === 'r') {
      e.preventDefault()
      applyCellUpdates(fillRightRange(getCommandSelection(), getValueAt))
      return
    }
    if (key === 'a') {
      e.preventDefault()
      activeSelection.value = makeSelectionRange(0, 0, maxRow, maxCol)
      activeCell.value = { rowIndex: 0, colIndex: 0 }
      selectionAnchor.value = { rowIndex: 0, colIndex: 0 }
      return
    }

    if (isArrowKey(keyRaw)) {
      e.preventDefault()
      const focus = activeCell.value ?? { rowIndex: 0, colIndex: 0 }
      const dir =
        keyRaw === 'ArrowUp' ? 'up' :
        keyRaw === 'ArrowDown' ? 'down' :
        keyRaw === 'ArrowLeft' ? 'left' : 'right'
      const edge = findEdgeInDirection(
        focus.rowIndex,
        focus.colIndex,
        dir,
        maxRow,
        maxCol,
        getValueAt,
      )
      if (e.shiftKey) {
        const anchor = selectionAnchor.value ?? focus
        setSelectionFromAnchor(anchor, edge)
      } else {
        navigateToCell(edge.rowIndex, edge.colIndex, false)
      }
      return
    }

    if (keyRaw === 'Home') {
      e.preventDefault()
      const focus = activeCell.value ?? { rowIndex: 0, colIndex: 0 }
      const target = { rowIndex: 0, colIndex: 0 }
      if (e.shiftKey) {
        setSelectionFromAnchor(selectionAnchor.value ?? focus, target)
      } else {
        navigateToCell(0, 0, false)
      }
      return
    }

    if (keyRaw === 'End') {
      e.preventDefault()
      const focus = activeCell.value ?? { rowIndex: 0, colIndex: 0 }
      const last = findLastUsedCell(maxRow, maxCol, getValueAt)
      if (e.shiftKey) {
        setSelectionFromAnchor(selectionAnchor.value ?? focus, last)
      } else {
        navigateToCell(last.rowIndex, last.colIndex, false)
      }
      return
    }
  }

  if (keyRaw === 'Home' && !isMeta) {
    e.preventDefault()
    const focus = activeCell.value ?? { rowIndex: 0, colIndex: 0 }
    const target = { rowIndex: focus.rowIndex, colIndex: 0 }
    if (e.shiftKey) {
      setSelectionFromAnchor(selectionAnchor.value ?? focus, target)
    } else {
      navigateToCell(target.rowIndex, target.colIndex, false)
    }
    return
  }

  if (keyRaw === 'End' && !isMeta) {
    e.preventDefault()
    const focus = activeCell.value ?? { rowIndex: 0, colIndex: 0 }
    const target = { rowIndex: focus.rowIndex, colIndex: maxCol }
    if (e.shiftKey) {
      setSelectionFromAnchor(selectionAnchor.value ?? focus, target)
    } else {
      navigateToCell(target.rowIndex, target.colIndex, false)
    }
    return
  }

  if (keyRaw === 'Enter' && !isMeta) {
    e.preventDefault()
    moveEnter(e.shiftKey)
    return
  }

  if (keyRaw === 'Tab' && !isMeta) {
    e.preventDefault()
    moveTab(e.shiftKey)
    return
  }

  if (!isMeta && !e.altKey && isArrowKey(keyRaw)) {
    e.preventDefault()
    const delta =
      keyRaw === 'ArrowUp' ? { row: -1, col: 0 } :
      keyRaw === 'ArrowDown' ? { row: 1, col: 0 } :
      keyRaw === 'ArrowLeft' ? { row: 0, col: -1 } :
      { row: 0, col: 1 }
    moveSelectionByDelta(delta.row, delta.col, e.shiftKey)
    return
  }

  if (
    !isMeta &&
    isActiveSelectColumn() &&
    (keyRaw === ' ' || (e.altKey && keyRaw === 'ArrowDown'))
  ) {
    e.preventDefault()
    const focus = activeCell.value ?? { rowIndex: 0, colIndex: 0 }
    void startEdit(focus.rowIndex, focus.colIndex, { overwrite: false })
    return
  }

  if (isPrintableKey(e)) {
    e.preventDefault()
    const focus = activeCell.value ?? { rowIndex: 0, colIndex: 0 }
    if (isSelectColumn(focus.colIndex)) {
      void startEdit(focus.rowIndex, focus.colIndex, { overwrite: false })
      return
    }
    startEdit(focus.rowIndex, focus.colIndex, { overwrite: true, initialChar: keyRaw })
  }
}

function startResize(colId: string | null, startX: number, startWidth: number) {
  const onMove = (e: MouseEvent) => {
    const delta = e.clientX - startX
    const newWidth = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, startWidth + delta))
    if (colId) grid.setColumnWidth(colId, newWidth)
    else grid.setTagsColumnWidth(newWidth)
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const isTwoPage = computed(() => layout.value === 'two-page')
const splitIndex = computed(() => effectiveSplitIndex.value)
const leftColumns = computed(() => visibleColumns.value.slice(0, splitIndex.value))
const rightColumns = computed(() => visibleColumns.value.slice(splitIndex.value))

const identificationColumn = computed(() => visibleColumns.value.find((c) => c.fieldKey === 'identification'))
const identificationUsedOnPage = computed(() => {
  const col = identificationColumn.value
  if (!col) return []
  const values: string[] = []
  for (const row of rows.value) {
    const v = (row.cells?.[col.id] ?? '').trim()
    if (v) values.push(v)
  }
  return [...new Set(values)]
})

const pilotsColumn = computed(() => visibleColumns.value.find((c) => c.fieldKey === 'pilots'))

const builderPilotSuggestions = computed<string[]>(() => {
  const seen = new Map<string, string>()
  const add = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const key = trimmed.toLowerCase()
    if (!seen.has(key)) seen.set(key, trimmed)
  }
  if (builderPilots) {
    for (const name of builderPilots.value ?? []) add(name)
  }
  const col = pilotsColumn.value
  if (col) {
    for (const row of rows.value) {
      add(row.cells?.[col.id] ?? '')
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
})

const tableRef = ref<HTMLTableElement | null>(null)
const isDraggingDivider = ref(false)
function startDividerDrag() {
  isDraggingDivider.value = true
  const onMove = (e: MouseEvent) => {
    if (!tableRef.value) return
    const dataCols = tableRef.value.querySelectorAll<HTMLTableCellElement>('thead tr th.logbook-builder-data-col')
    if (!dataCols.length) return
    const n = dataCols.length
    for (let k = 1; k <= n - 1; k++) {
      const rect = dataCols[k - 1].getBoundingClientRect()
      if (e.clientX <= rect.right) {
        grid.setTwoPageSplitIndex(k)
        return
      }
    }
    grid.setTwoPageSplitIndex(n - 1)
  }
  const onUp = () => {
    isDraggingDivider.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const gridContainerRef = ref<HTMLElement | null>(null)
type CellRefHandle = {
  focus: () => void
  beginEdit?: (options: { overwrite: boolean }) => void
  commitEdit?: () => void
  cancelEdit?: (restoreValue: string) => void
  getInputElement?: () => HTMLInputElement | HTMLTextAreaElement | null
  getSelectElement?: () => HTMLSelectElement | null
  shouldDeferGridKeydown?: (e: KeyboardEvent) => boolean
}
const cellRefs = ref<Map<string, CellRefHandle>>(new Map())

function cellKey(rowIdx: number, colId: string) {
  return `${rowIdx}-${colId}`
}

function getCellValue(rowIdx: number, colId: string): string {
  const row = rows.value[rowIdx]
  if (!row?.cells) return ''
  return row.cells[colId] ?? ''
}

function getDigifiCellMeta(rowIdx: number, colId: string) {
  return rows.value[rowIdx]?.digifiCellMeta?.[colId] ?? null
}

function getDigifiSuggestions(rowIdx: number, colId: string, fieldKey: string | null) {
  if (fieldKey === 'pilots') return builderPilotSuggestions.value
  const fromMeta = getDigifiCellMeta(rowIdx, colId)?.candidates?.map((candidate) => candidate.value) ?? []
  if (fieldKey === 'identification') {
    return Array.from(new Set([...fromMeta, ...identificationUsedOnPage.value]))
  }
  if (fieldKey === 'departure' || fieldKey === 'destination' || fieldKey === 'route') {
    return Array.from(new Set(fromMeta))
  }
  return []
}

function getDigifiCellTitle(rowIdx: number, colId: string): string | undefined {
  const meta = getDigifiCellMeta(rowIdx, colId)
  if (!meta) return undefined
  if (meta.needsReview && (meta.candidates?.length ?? 0) > 0) {
    const preview = meta.candidates?.slice(0, 3).map((candidate) => candidate.value).join(', ')
    return `${meta.message ?? 'Review this AI match.'}${preview ? ` Top matches: ${preview}.` : ''}`
  }
  if (meta.autoApplied && meta.rawValue.trim() && meta.rawValue.trim() !== meta.resolvedValue.trim()) {
    return meta.message ?? `AI changed "${meta.rawValue}" to "${meta.resolvedValue}".`
  }
  return meta.message
}

function digifiCellState(rowIdx: number, colId: string): 'review' | 'auto' | 'confirmed' | null {
  const meta = getDigifiCellMeta(rowIdx, colId)
  if (!meta) return null
  if (meta.needsReview) return 'review'
  if (meta.userConfirmed) return 'confirmed'
  if (meta.autoApplied) return 'auto'
  return null
}

function onCellInput(rowIdx: number, colId: string, value: string) {
  setCell(rowIdx, colId, value)
  noteDigifiCellManualEdit(rowIdx, colId, value)
}

function setCellRef(rowIdx: number, colId: string, el: CellRefHandle | null) {
  if (el && typeof el.focus === 'function') {
    cellRefs.value.set(cellKey(rowIdx, colId), el)
  }
}

function focusCell(rowIdx: number, colId: string) {
  const el = cellRefs.value.get(cellKey(rowIdx, colId))
  el?.focus?.()
}

function onCellDoubleClick(event: MouseEvent) {
  event.preventDefault()
  const cell = getCellFromEvent(event)
  if (!cell) return
  startEdit(cell.rowIndex, cell.colIndex, { overwrite: false })
}

function focusCellByIndex(rowIdx: number, colIdx: number) {
  const col = visibleColumns.value[colIdx]
  if (col) focusCell(rowIdx, col.id)
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown, true)
  gridContainerRef.value?.addEventListener('mousedown', onGridMouseDown, true)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown, true)
  gridContainerRef.value?.removeEventListener('mousedown', onGridMouseDown, true)
})

defineExpose({
  gridContainerRef,
  cellRefs,
  focusCell,
  focusCellByIndex,
  visibleColumns: grid.visibleColumns,
})
</script>

<template>
  <div
    ref="gridContainerRef"
    tabindex="0"
    class="overflow-auto border pb-4 outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/50"
    :class="isDark
      ? 'border-white/10 bg-gray-900 shadow-md shadow-black/40'
      : 'border-gray-200 bg-white shadow-sm'"
  >
    <table ref="tableRef" class="w-full border-collapse font-quicksand text-sm" style="table-layout: fixed">
      <thead
        class="sticky top-0 z-10 border-b"
        :class="isDark ? 'bg-gray-900 border-white/10 shadow-md shadow-black/40' : 'bg-gray-50 border-gray-200'"
      >
        <tr>
          <template v-if="isTwoPage">
            <th
              v-for="col in leftColumns"
              :key="col.id"
              :class="[
                'logbook-builder-data-col relative min-w-0 cursor-move border px-1.5 py-1 text-center text-xs font-semibold',
                isDark ? 'border-white/10 text-gray-300' : 'border-gray-200 text-black',
                draggedColumnId === col.id ? (isDark ? 'opacity-50 bg-white/5' : 'opacity-50 bg-gray-200') : '',
                draggedColumnId && draggedColumnId !== col.id ? (isDark ? 'bg-white/5' : 'bg-gray-50') : ''
              ]"
              :style="getColumnStyle(col)"
              aria-label="Drag to reorder column"
              draggable="true"
              @dragstart="onHeaderDragStart(col.id, $event)"
              @dragend="onHeaderDragEnd"
              @dragover.prevent
              @drop.prevent="handleHeaderDrop(col.id)"
            >
              <div class="flex min-w-0 items-center justify-center">
                <LogbookBuilderHeader :column="col" @update="(_, updates) => updateColumn(col.id, updates)" />
              </div>
              <span
                class="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/50 dark:hover:bg-blue-500/50"
                title="Drag to resize column"
                @mousedown.prevent="startResize(col.id, $event.clientX, col.width ?? DEFAULT_COLUMN_WIDTH)"
              />
            </th>
            <th 
              :class="[
                'relative w-4 border-b border-l-4',
                isDark ? 'border-white/10 bg-gray-900' : 'border-gray-400 bg-gray-200'
              ]"
              aria-hidden="true"
            >
              <div
                class="absolute inset-0 cursor-col-resize hover:bg-gray-300/80 dark:hover:bg-gray-600/80"
                title="Drag to move page break"
                @mousedown.prevent="startDividerDrag"
              />
            </th>
            <th
              v-for="col in rightColumns"
              :key="col.id"
              :class="[
                'logbook-builder-data-col relative min-w-0 cursor-move border px-1.5 py-1 text-center text-xs font-semibold',
                isDark ? 'border-white/10 text-gray-300' : 'border-gray-200 text-black',
                draggedColumnId === col.id ? (isDark ? 'opacity-50 bg-white/5' : 'opacity-50 bg-gray-200') : '',
                draggedColumnId && draggedColumnId !== col.id ? (isDark ? 'bg-white/5' : 'bg-gray-50') : ''
              ]"
              :style="getColumnStyle(col)"
              aria-label="Drag to reorder column"
              draggable="true"
              @dragstart="onHeaderDragStart(col.id, $event)"
              @dragend="onHeaderDragEnd"
              @dragover.prevent
              @drop.prevent="handleHeaderDrop(col.id)"
            >
              <div class="flex min-w-0 items-center justify-center">
                <LogbookBuilderHeader :column="col" @update="(_, updates) => updateColumn(col.id, updates)" />
              </div>
              <span
                class="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/50 dark:hover:bg-blue-500/50"
                title="Drag to resize column"
                @mousedown.prevent="startResize(col.id, $event.clientX, col.width ?? DEFAULT_COLUMN_WIDTH)"
              />
            </th>
          </template>
          <template v-else>
            <th
              v-for="col in visibleColumns"
              :key="col.id"
              :class="[
                'logbook-builder-data-col relative min-w-0 cursor-move border px-1.5 py-1 text-center text-xs font-semibold',
                isDark ? 'border-white/10 text-gray-300' : 'border-gray-200 text-black',
                draggedColumnId === col.id ? (isDark ? 'opacity-50 bg-white/5' : 'opacity-50 bg-gray-200') : '',
                draggedColumnId && draggedColumnId !== col.id ? (isDark ? 'bg-white/5' : 'bg-gray-50') : ''
              ]"
              :style="getColumnStyle(col)"
              aria-label="Drag to reorder column"
              draggable="true"
              @dragstart="onHeaderDragStart(col.id, $event)"
              @dragend="onHeaderDragEnd"
              @dragover.prevent
              @drop.prevent="handleHeaderDrop(col.id)"
            >
              <div class="flex min-w-0 items-center justify-center">
                <LogbookBuilderHeader :column="col" @update="(_, updates) => updateColumn(col.id, updates)" />
              </div>
              <span
                class="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/50 dark:hover:bg-blue-500/50"
                title="Drag to resize column"
                @mousedown.prevent="startResize(col.id, $event.clientX, col.width ?? DEFAULT_COLUMN_WIDTH)"
              />
            </th>
          </template>
          <th
            :class="[
              'relative border px-1.5 py-1 text-center text-xs font-semibold uppercase tracking-wider',
              isDark ? 'border-white/10 text-gray-300' : 'border-gray-200 text-black'
            ]"
            :style="{ width: tagsColumnWidth + 'px', minWidth: tagsColumnWidth + 'px' }"
          >
            Tags
            <span
              class="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/50 dark:hover:bg-blue-500/50"
              title="Drag to resize column"
              @mousedown.prevent="startResize(null, $event.clientX, tagsColumnWidth)"
            />
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, rowIdx) in rows"
          :key="rowIdx"
          :class="[
            'transition-colors',
            activeRowIndex === rowIdx ? 'bg-blue-50 dark:bg-blue-900/20' : '',
          ]"
        >
          <template v-if="isTwoPage">
            <td
              v-for="(col, colIdx) in leftColumns"
              :key="col.id"
              :class="[
                'relative border p-0 text-center',
                isDark ? 'border-white/10' : 'border-gray-200',
                digifiCellState(rowIdx, col.id) === 'review' ? (isDark ? 'bg-amber-500/10' : 'bg-amber-50/70') : '',
                digifiCellState(rowIdx, col.id) === 'auto' ? (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50/70') : '',
                digifiCellState(rowIdx, col.id) === 'confirmed' ? (isDark ? 'bg-sky-500/10' : 'bg-sky-50/70') : '',
                isCellInSelection(rowIdx, colIdx) ? (isDark ? 'bg-blue-500/20' : 'bg-blue-100/60') : '',
                isActiveCell(rowIdx, colIdx) ? (isDark ? 'ring-1 ring-inset ring-blue-400' : 'ring-1 ring-inset ring-blue-500') : '',
                isSelectionTopEdge(rowIdx, colIdx) ? 'border-t-2 border-t-blue-500' : '',
                isSelectionBottomEdge(rowIdx, colIdx) ? 'border-b-2 border-b-blue-500' : '',
                isSelectionLeftEdge(rowIdx, colIdx) ? 'border-l-2 border-l-blue-500' : '',
                isSelectionRightEdge(rowIdx, colIdx) ? 'border-r-2 border-r-blue-500' : '',
              ]"
              :style="getColumnStyle(col)"
              :title="getDigifiCellTitle(rowIdx, col.id)"
              :data-builder-row="rowIdx"
              :data-builder-col="colIdx"
              @dblclick="onCellDoubleClick"
            >
              <LogbookBuilderCell
                :ref="(el) => setCellRef(rowIdx, col.id, el as CellRefHandle | null)"
                :model-value="getCellValue(rowIdx, col.id)"
                :field-key="col.fieldKey"
                :category-class-value="col.categoryClassValue"
                :default-role="col.fieldKey === 'role' ? (grid.defaultImportRole?.value ?? 'PIC') : undefined"
                :suggestions="getDigifiSuggestions(rowIdx, col.id, col.fieldKey)"
                :builder-row="rowIdx"
                :builder-col="colIdx"
                :is-editing="isCellEditing(rowIdx, colIdx)"
                @update:model-value="(v) => onCellInput(rowIdx, col.id, v)"
                @focus="onCellFocus(rowIdx, colIdx)"
                @blur="onCellBlur"
                @dropdown-commit="onCellDropdownCommit"
              />
              <span
                v-if="digifiCellState(rowIdx, col.id)"
                :class="[
                  'pointer-events-none absolute left-1 top-1 rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  digifiCellState(rowIdx, col.id) === 'review'
                    ? (isDark ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-800')
                    : digifiCellState(rowIdx, col.id) === 'auto'
                      ? (isDark ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-800')
                      : (isDark ? 'bg-sky-500/20 text-sky-200' : 'bg-sky-100 text-sky-800'),
                ]"
              >
                {{ digifiCellState(rowIdx, col.id) === 'review' ? '?' : 'AI' }}
              </span>
              <span
                v-if="isSelectionTopEdge(rowIdx, colIdx)"
                class="absolute inset-x-0 top-0 z-10 h-1.5 -translate-y-1/2 cursor-move"
                aria-label="Drag to move"
                title="Drag to move (⌘/Ctrl = copy)"
                @mousedown="onSelectionBorderMouseDown"
              />
              <span
                v-if="isSelectionBottomEdge(rowIdx, colIdx)"
                class="absolute inset-x-0 bottom-0 z-10 h-1.5 translate-y-1/2 cursor-move"
                aria-label="Drag to move"
                title="Drag to move (⌘/Ctrl = copy)"
                @mousedown="onSelectionBorderMouseDown"
              />
              <span
                v-if="isSelectionLeftEdge(rowIdx, colIdx)"
                class="absolute inset-y-0 left-0 z-10 w-1.5 -translate-x-1/2 cursor-move"
                aria-label="Drag to move"
                title="Drag to move (⌘/Ctrl = copy)"
                @mousedown="onSelectionBorderMouseDown"
              />
              <span
                v-if="isSelectionRightEdge(rowIdx, colIdx)"
                class="absolute inset-y-0 right-0 z-10 w-1.5 translate-x-1/2 cursor-move"
                aria-label="Drag to move"
                title="Drag to move (⌘/Ctrl = copy)"
                @mousedown="onSelectionBorderMouseDown"
              />
              <button
                v-if="isHandleCell(rowIdx, colIdx)"
                type="button"
                class="absolute bottom-0 right-0 h-2 w-2 translate-x-1/2 translate-y-1/2 rounded-sm border border-blue-500 bg-blue-500 hover:bg-blue-600 dark:border-blue-300 dark:bg-blue-300 dark:hover:bg-blue-200 cursor-crosshair z-20"
                aria-label="Drag to fill"
                @mousedown="onFillHandleMouseDown"
              />
            </td>
            <td 
              :class="[
                'w-4 border-b border-l-4',
                isDark ? 'border-white/10 bg-gray-900' : 'border-gray-400 bg-gray-200'
              ]"
              aria-hidden="true" 
            />
            <td
              v-for="(col, colIdx) in rightColumns"
              :key="col.id"
              :class="[
                'relative border p-0 text-center',
                isDark ? 'border-white/10' : 'border-gray-200',
                digifiCellState(rowIdx, col.id) === 'review' ? (isDark ? 'bg-amber-500/10' : 'bg-amber-50/70') : '',
                digifiCellState(rowIdx, col.id) === 'auto' ? (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50/70') : '',
                digifiCellState(rowIdx, col.id) === 'confirmed' ? (isDark ? 'bg-sky-500/10' : 'bg-sky-50/70') : '',
                isCellInSelection(rowIdx, splitIndex + colIdx) ? (isDark ? 'bg-blue-500/20' : 'bg-blue-100/60') : '',
                isActiveCell(rowIdx, splitIndex + colIdx) ? (isDark ? 'ring-1 ring-inset ring-blue-400' : 'ring-1 ring-inset ring-blue-500') : '',
                isSelectionTopEdge(rowIdx, splitIndex + colIdx) ? 'border-t-2 border-t-blue-500' : '',
                isSelectionBottomEdge(rowIdx, splitIndex + colIdx) ? 'border-b-2 border-b-blue-500' : '',
                isSelectionLeftEdge(rowIdx, splitIndex + colIdx) ? 'border-l-2 border-l-blue-500' : '',
                isSelectionRightEdge(rowIdx, splitIndex + colIdx) ? 'border-r-2 border-r-blue-500' : '',
              ]"
              :style="getColumnStyle(col)"
              :title="getDigifiCellTitle(rowIdx, col.id)"
              :data-builder-row="rowIdx"
              :data-builder-col="splitIndex + colIdx"
              @dblclick="onCellDoubleClick"
            >
              <LogbookBuilderCell
                :ref="(el) => setCellRef(rowIdx, col.id, el as CellRefHandle | null)"
                :model-value="getCellValue(rowIdx, col.id)"
                :field-key="col.fieldKey"
                :category-class-value="col.categoryClassValue"
                :default-role="col.fieldKey === 'role' ? (grid.defaultImportRole?.value ?? 'PIC') : undefined"
                :suggestions="getDigifiSuggestions(rowIdx, col.id, col.fieldKey)"
                :builder-row="rowIdx"
                :builder-col="splitIndex + colIdx"
                :is-editing="isCellEditing(rowIdx, splitIndex + colIdx)"
                @update:model-value="(v) => onCellInput(rowIdx, col.id, v)"
                @focus="onCellFocus(rowIdx, splitIndex + colIdx)"
                @blur="onCellBlur"
                @dropdown-commit="onCellDropdownCommit"
              />
              <span
                v-if="digifiCellState(rowIdx, col.id)"
                :class="[
                  'pointer-events-none absolute left-1 top-1 rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  digifiCellState(rowIdx, col.id) === 'review'
                    ? (isDark ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-800')
                    : digifiCellState(rowIdx, col.id) === 'auto'
                      ? (isDark ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-800')
                      : (isDark ? 'bg-sky-500/20 text-sky-200' : 'bg-sky-100 text-sky-800'),
                ]"
              >
                {{ digifiCellState(rowIdx, col.id) === 'review' ? '?' : 'AI' }}
              </span>
              <span
                v-if="isSelectionTopEdge(rowIdx, splitIndex + colIdx)"
                class="absolute inset-x-0 top-0 z-10 h-1.5 -translate-y-1/2 cursor-move"
                aria-label="Drag to move"
                title="Drag to move (⌘/Ctrl = copy)"
                @mousedown="onSelectionBorderMouseDown"
              />
              <span
                v-if="isSelectionBottomEdge(rowIdx, splitIndex + colIdx)"
                class="absolute inset-x-0 bottom-0 z-10 h-1.5 translate-y-1/2 cursor-move"
                aria-label="Drag to move"
                title="Drag to move (⌘/Ctrl = copy)"
                @mousedown="onSelectionBorderMouseDown"
              />
              <span
                v-if="isSelectionLeftEdge(rowIdx, splitIndex + colIdx)"
                class="absolute inset-y-0 left-0 z-10 w-1.5 -translate-x-1/2 cursor-move"
                aria-label="Drag to move"
                title="Drag to move (⌘/Ctrl = copy)"
                @mousedown="onSelectionBorderMouseDown"
              />
              <span
                v-if="isSelectionRightEdge(rowIdx, splitIndex + colIdx)"
                class="absolute inset-y-0 right-0 z-10 w-1.5 translate-x-1/2 cursor-move"
                aria-label="Drag to move"
                title="Drag to move (⌘/Ctrl = copy)"
                @mousedown="onSelectionBorderMouseDown"
              />
              <button
                v-if="isHandleCell(rowIdx, splitIndex + colIdx)"
                type="button"
                class="absolute bottom-0 right-0 h-2 w-2 translate-x-1/2 translate-y-1/2 rounded-sm border border-blue-500 bg-blue-500 hover:bg-blue-600 dark:border-blue-300 dark:bg-blue-300 dark:hover:bg-blue-200 cursor-crosshair z-20"
                aria-label="Drag to fill"
                @mousedown="onFillHandleMouseDown"
              />
            </td>
          </template>
          <template v-else>
            <td
              v-for="(col, colIdx) in visibleColumns"
              :key="col.id"
              :class="[
                'relative border p-0 text-center',
                isDark ? 'border-white/10' : 'border-gray-200',
                digifiCellState(rowIdx, col.id) === 'review' ? (isDark ? 'bg-amber-500/10' : 'bg-amber-50/70') : '',
                digifiCellState(rowIdx, col.id) === 'auto' ? (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50/70') : '',
                digifiCellState(rowIdx, col.id) === 'confirmed' ? (isDark ? 'bg-sky-500/10' : 'bg-sky-50/70') : '',
                isCellInSelection(rowIdx, colIdx) ? (isDark ? 'bg-blue-500/20' : 'bg-blue-100/60') : '',
                isActiveCell(rowIdx, colIdx) ? (isDark ? 'ring-1 ring-inset ring-blue-400' : 'ring-1 ring-inset ring-blue-500') : '',
                isSelectionTopEdge(rowIdx, colIdx) ? 'border-t-2 border-t-blue-500' : '',
                isSelectionBottomEdge(rowIdx, colIdx) ? 'border-b-2 border-b-blue-500' : '',
                isSelectionLeftEdge(rowIdx, colIdx) ? 'border-l-2 border-l-blue-500' : '',
                isSelectionRightEdge(rowIdx, colIdx) ? 'border-r-2 border-r-blue-500' : '',
              ]"
              :style="getColumnStyle(col)"
              :title="getDigifiCellTitle(rowIdx, col.id)"
              :data-builder-row="rowIdx"
              :data-builder-col="colIdx"
              @dblclick="onCellDoubleClick"
            >
              <LogbookBuilderCell
                :ref="(el) => setCellRef(rowIdx, col.id, el as CellRefHandle | null)"
                :model-value="getCellValue(rowIdx, col.id)"
                :field-key="col.fieldKey"
                :category-class-value="col.categoryClassValue"
                :default-role="col.fieldKey === 'role' ? (grid.defaultImportRole?.value ?? 'PIC') : undefined"
                :suggestions="getDigifiSuggestions(rowIdx, col.id, col.fieldKey)"
                :builder-row="rowIdx"
                :builder-col="colIdx"
                :is-editing="isCellEditing(rowIdx, colIdx)"
                @update:model-value="(v) => onCellInput(rowIdx, col.id, v)"
                @focus="onCellFocus(rowIdx, colIdx)"
                @blur="onCellBlur"
                @dropdown-commit="onCellDropdownCommit"
              />
              <span
                v-if="digifiCellState(rowIdx, col.id)"
                :class="[
                  'pointer-events-none absolute left-1 top-1 rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  digifiCellState(rowIdx, col.id) === 'review'
                    ? (isDark ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-800')
                    : digifiCellState(rowIdx, col.id) === 'auto'
                      ? (isDark ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-800')
                      : (isDark ? 'bg-sky-500/20 text-sky-200' : 'bg-sky-100 text-sky-800'),
                ]"
              >
                {{ digifiCellState(rowIdx, col.id) === 'review' ? '?' : 'AI' }}
              </span>
              <span
                v-if="isSelectionTopEdge(rowIdx, colIdx)"
                class="absolute inset-x-0 top-0 z-10 h-1.5 -translate-y-1/2 cursor-move"
                aria-label="Drag to move"
                title="Drag to move (⌘/Ctrl = copy)"
                @mousedown="onSelectionBorderMouseDown"
              />
              <span
                v-if="isSelectionBottomEdge(rowIdx, colIdx)"
                class="absolute inset-x-0 bottom-0 z-10 h-1.5 translate-y-1/2 cursor-move"
                aria-label="Drag to move"
                title="Drag to move (⌘/Ctrl = copy)"
                @mousedown="onSelectionBorderMouseDown"
              />
              <span
                v-if="isSelectionLeftEdge(rowIdx, colIdx)"
                class="absolute inset-y-0 left-0 z-10 w-1.5 -translate-x-1/2 cursor-move"
                aria-label="Drag to move"
                title="Drag to move (⌘/Ctrl = copy)"
                @mousedown="onSelectionBorderMouseDown"
              />
              <span
                v-if="isSelectionRightEdge(rowIdx, colIdx)"
                class="absolute inset-y-0 right-0 z-10 w-1.5 translate-x-1/2 cursor-move"
                aria-label="Drag to move"
                title="Drag to move (⌘/Ctrl = copy)"
                @mousedown="onSelectionBorderMouseDown"
              />
              <button
                v-if="isHandleCell(rowIdx, colIdx)"
                type="button"
                class="absolute bottom-0 right-0 h-2 w-2 translate-x-1/2 translate-y-1/2 rounded-sm border border-blue-500 bg-blue-500 hover:bg-blue-600 dark:border-blue-300 dark:bg-blue-300 dark:hover:bg-blue-200 cursor-crosshair z-20"
                aria-label="Drag to fill"
                @mousedown="onFillHandleMouseDown"
              />
            </td>
          </template>
          <td
            :class="[
              'border p-0.5 text-center',
              isDark ? 'border-white/10' : 'border-gray-200'
            ]"
            :style="{ width: tagsColumnWidth + 'px', minWidth: tagsColumnWidth + 'px' }"
            @focusin="setActiveRowIndex(rowIdx)"
            @focusout="setActiveRowIndex(null)"
          >
            <LogbookBuilderRowTags
              :model-value="row.tags ?? []"
              @update:model-value="(tags) => setRowTags(rowIdx, tags)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
