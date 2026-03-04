<script setup lang="ts">
import { ref, inject, computed, onMounted, onUnmounted } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { DEFAULT_COLUMN_WIDTH } from '~/utils/logbookBuilderTypes'
import LogbookBuilderCell from './LogbookBuilderCell.vue'
import LogbookBuilderHeader from './LogbookBuilderHeader.vue'
import LogbookBuilderRowTags from './LogbookBuilderRowTags.vue'
import { useTheme } from '~/composables/useTheme'

const grid = inject<ReturnType<typeof useLogbookBuilderGrid>>('logbookBuilderGrid')
if (!grid) throw new Error('LogbookBuilderGrid must be used inside a page that provides logbookBuilderGrid')
const { visibleColumns, rows, setCell, setRowTags, updateColumn, reorderColumns, layout, effectiveSplitIndex, setTwoPageSplitIndex, tagsColumnWidth, setColumnWidth, setTagsColumnWidth, MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH, activeRowIndex, setActiveRowIndex } = grid

const { isDark } = useTheme()

const draggedColumnId = ref<string | null>(null)

type ActiveCell = {
  rowIndex: number
  colIndex: number
}

type SelectionRange = {
  startRow: number
  endRow: number
  startCol: number
  endCol: number
}

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

type ClipboardPayload = {
  width: number
  height: number
  values: string[][]
}

const activeCell = ref<ActiveCell | null>(null)
const activeSelection = ref<SelectionRange | null>(null)
const dragFill = ref<DragFillState | null>(null)
const clipboard = ref<ClipboardPayload | null>(null)
const isDraggingSelection = ref(false)
const selectionAnchor = ref<ActiveCell | null>(null)

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

function applyFillFromActiveToRange(range: SelectionRange, source: ActiveCell | null) {
  if (!source) return
  const cols = visibleColumns.value
  const sourceCol = cols[source.colIndex]
  if (!sourceCol) return
  const sourceRow = rows.value[source.rowIndex]
  if (!sourceRow?.cells) return
  const sourceValue = sourceRow.cells[sourceCol.id] ?? ''

  for (let r = range.startRow; r <= range.endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      if (r === source.rowIndex && c === source.colIndex) continue
      const col = cols[c]
      if (!col) continue
      setCell(r, col.id, sourceValue)
    }
  }
}

function applyBlockCopy(base: SelectionRange, dest: SelectionRange) {
  const cols = visibleColumns.value
  for (let r = dest.startRow; r <= dest.endRow; r++) {
    const rowOffset = r - dest.startRow
    const srcRow = base.startRow + rowOffset
    if (srcRow < base.startRow || srcRow > base.endRow) continue
    const srcRowData = rows.value[srcRow]
    if (!srcRowData?.cells) continue
    for (let c = dest.startCol; c <= dest.endCol; c++) {
      const colOffset = c - dest.startCol
      const srcCol = base.startCol + colOffset
      if (srcCol < base.startCol || srcCol > base.endCol) continue
      const destCol = cols[c]
      const srcColDef = cols[srcCol]
      if (!destCol || !srcColDef) continue
      const value = srcRowData.cells[srcColDef.id] ?? ''
      setCell(r, destCol.id, value)
    }
  }
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

function onCellFocus(rowIdx: number, colIdx: number) {
  activeCell.value = clampRowCol(rowIdx, colIdx)
  setActiveRowIndex(rowIdx)
  const cell = activeCell.value
  const currentSelection = activeSelection.value
  if (!cell) return
  if (!currentSelection || !isCellInSelection(cell.rowIndex, cell.colIndex)) {
    setSelectionFromAnchor(cell, cell)
  }
}

function onCellBlur() {
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

  const cellFromEvent = getCellFromEvent(event)
  const cell = cellFromEvent ?? findCellFromPoint(event.clientX, event.clientY)
  if (!cell) return

  const targetTag = (event.target as HTMLElement | null)?.tagName?.toLowerCase()
  const isFormControl = targetTag === 'input' || targetTag === 'select' || targetTag === 'textarea'
  if (!isFormControl) {
    // Prevent native text selection when dragging over plain cell area,
    // but allow normal focus behavior when interacting directly with inputs/selects.
    event.preventDefault()
  }

  if (event.shiftKey) {
    const anchor = selectionAnchor.value ?? activeCell.value ?? cell
    setSelectionFromAnchor(anchor, cell)
    setActiveRowIndex(anchor.rowIndex)
  } else {
    setSelectionFromAnchor(cell, cell)
    setActiveRowIndex(cell.rowIndex)
  }

  // Ensure the inner input/select receives focus so typing works even when clicking cell background.
  focusCellByIndex(cell.rowIndex, cell.colIndex)

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

function handleKeyDown(e: KeyboardEvent) {
  const keyRaw = e.key
  const key = keyRaw.toLowerCase()
  const isMeta = e.metaKey || e.ctrlKey
  const target = e.target as HTMLElement | null
  if (!target) return
  const tagName = target.tagName?.toLowerCase()
  if (tagName !== 'input' && tagName !== 'textarea' && tagName !== 'select') return

  const dataset = target.dataset
  const rowStr = dataset.builderRow
  const colStr = dataset.builderCol
  if (rowStr == null || colStr == null) return
  const row = parseInt(rowStr, 10)
  const col = parseInt(colStr, 10)
  if (Number.isNaN(row) || Number.isNaN(col)) return

  const cell = clampRowCol(row, col)

  const isArrowKey =
    key === 'arrowup' ||
    key === 'arrowdown' ||
    key === 'arrowleft' ||
    key === 'arrowright'

  if (!isMeta && !e.altKey && isArrowKey) {
    const maxRow = Math.max(0, rows.value.length - 1)
    const maxCol = Math.max(0, visibleColumns.value.length - 1)

    let anchor = selectionAnchor.value ?? activeCell.value ?? cell
    anchor = clampRowCol(anchor.rowIndex, anchor.colIndex)

    let focus = activeCell.value ?? cell
    focus = clampRowCol(focus.rowIndex, focus.colIndex)

    const delta = { row: 0, col: 0 }
    switch (key) {
      case 'arrowup':
        delta.row = -1
        break
      case 'arrowdown':
        delta.row = 1
        break
      case 'arrowleft':
        delta.col = -1
        break
      case 'arrowright':
        delta.col = 1
        break
    }

    const nextFocus = clampRowCol(
      focus.rowIndex + delta.row,
      focus.colIndex + delta.col,
    )

    if (e.shiftKey) {
      setSelectionFromAnchor(anchor, nextFocus)
    } else {
      setSelectionFromAnchor(nextFocus, nextFocus)
    }

    focusCellByIndex(nextFocus.rowIndex, nextFocus.colIndex)
    setActiveRowIndex(nextFocus.rowIndex)
    e.preventDefault()
    return
  }

  if (!isMeta || (key !== 'c' && key !== 'v')) return

  if (key === 'c') {
    const base = activeSelection.value ?? {
      startRow: cell.rowIndex,
      endRow: cell.rowIndex,
      startCol: cell.colIndex,
      endCol: cell.colIndex,
    }
    const maxRow = rows.value.length - 1
    const maxCol = visibleColumns.value.length - 1
    const startRow = Math.max(0, Math.min(base.startRow, maxRow))
    const endRow = Math.max(0, Math.min(base.endRow, maxRow))
    const startCol = Math.max(0, Math.min(base.startCol, maxCol))
    const endCol = Math.max(0, Math.min(base.endCol, maxCol))

    const height = endRow - startRow + 1
    const width = endCol - startCol + 1
    if (height <= 0 || width <= 0) return

    const values: string[][] = []
    for (let r = startRow; r <= endRow; r++) {
      const rowVals: string[] = []
      for (let c = startCol; c <= endCol; c++) {
        const colDef = visibleColumns.value[c]
        if (!colDef) {
          rowVals.push('')
          continue
        }
        rowVals.push(getCellValue(r, colDef.id))
      }
      values.push(rowVals)
    }
    clipboard.value = { width, height, values }

    // Also try to copy to the system clipboard as TSV so it can be pasted into spreadsheets.
    const tsvLines = values.map((rowVals) =>
      rowVals.map((v) => v.replace(/\t/g, ' ')).join('\t')
    )
    const tsv = tsvLines.join('\n')
    if (typeof navigator !== 'undefined' && (navigator as any).clipboard?.writeText) {
      ;(navigator as any).clipboard.writeText(tsv).catch(() => {
        // Ignore clipboard errors; internal clipboard still works.
      })
    }
    e.preventDefault()
    return
  }

  if (key === 'v') {
    const applyMatrix = (matrix: string[][]) => {
      const maxRow = rows.value.length - 1
      const maxCol = visibleColumns.value.length - 1
      const height = matrix.length
      const width = matrix[0]?.length ?? 0
      if (height <= 0 || width <= 0) return

      for (let rOff = 0; rOff < height; rOff++) {
        const destRow = cell.rowIndex + rOff
        if (destRow > maxRow) break
        const rowVals = matrix[rOff] ?? []
        for (let cOff = 0; cOff < width; cOff++) {
          const destCol = cell.colIndex + cOff
          if (destCol > maxCol) break
          const colDef = visibleColumns.value[destCol]
          if (!colDef) continue
          const value = rowVals[cOff] ?? ''
          setCell(destRow, colDef.id, value)
        }
      }
    }

    const hasSystemClipboard =
      typeof navigator !== 'undefined' &&
      (navigator as any).clipboard?.readText

    if (hasSystemClipboard) {
      ;(navigator as any).clipboard
        .readText()
        .then((text: string) => {
          const lines = text.split(/\r?\n/)
          const matrix = lines.map((line) => line.split('\t'))
          if (matrix.length && matrix[0].length) {
            applyMatrix(matrix)
          } else if (clipboard.value) {
            applyMatrix(clipboard.value.values)
          }
        })
        .catch(() => {
          if (clipboard.value) {
            applyMatrix(clipboard.value.values)
          }
        })
    } else if (clipboard.value) {
      applyMatrix(clipboard.value.values)
    }

    e.preventDefault()
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
const cellRefs = ref<Map<string, { focus: () => void }>>(new Map())

function cellKey(rowIdx: number, colId: string) {
  return `${rowIdx}-${colId}`
}

function getCellValue(rowIdx: number, colId: string): string {
  const row = rows.value[rowIdx]
  if (!row?.cells) return ''
  return row.cells[colId] ?? ''
}

function onCellInput(rowIdx: number, colId: string, value: string) {
  setCell(rowIdx, colId, value)
}

function setCellRef(rowIdx: number, colId: string, el: { focus: () => void } | null) {
  if (el && typeof (el as { focus?: () => void }).focus === 'function') {
    cellRefs.value.set(cellKey(rowIdx, colId), el as { focus: () => void })
  }
}

function focusCell(rowIdx: number, colId: string) {
  const el = cellRefs.value.get(cellKey(rowIdx, colId))
  el?.focus?.()
}

function focusCellByIndex(rowIdx: number, colIdx: number) {
  const col = visibleColumns.value[colIdx]
  if (col) focusCell(rowIdx, col.id)
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown, true)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown, true)
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
    class="overflow-auto border pb-4"
    :class="isDark
      ? 'border-gray-600 bg-gray-800'
      : 'border-gray-200 bg-white shadow-sm'"
  >
    <table ref="tableRef" class="w-full border-collapse font-quicksand text-sm" style="table-layout: fixed">
      <thead
        class="sticky top-0 z-10 border-b"
        :class="isDark ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'"
      >
        <tr>
          <template v-if="isTwoPage">
            <th
              v-for="col in leftColumns"
              :key="col.id"
              :class="[
                'logbook-builder-data-col relative min-w-0 cursor-move border px-1.5 py-1 text-center text-xs font-semibold',
                isDark ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-black',
                draggedColumnId === col.id ? (isDark ? 'opacity-50 bg-gray-700' : 'opacity-50 bg-gray-200') : '',
                draggedColumnId && draggedColumnId !== col.id ? (isDark ? 'bg-gray-700/70' : 'bg-gray-50') : ''
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
                isDark ? 'border-gray-500 bg-gray-700' : 'border-gray-400 bg-gray-200'
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
                isDark ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-black',
                draggedColumnId === col.id ? (isDark ? 'opacity-50 bg-gray-700' : 'opacity-50 bg-gray-200') : '',
                draggedColumnId && draggedColumnId !== col.id ? (isDark ? 'bg-gray-700/70' : 'bg-gray-50') : ''
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
                isDark ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-black',
                draggedColumnId === col.id ? (isDark ? 'opacity-50 bg-gray-700' : 'opacity-50 bg-gray-200') : '',
                draggedColumnId && draggedColumnId !== col.id ? (isDark ? 'bg-gray-700/70' : 'bg-gray-50') : ''
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
              isDark ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-black'
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
      <tbody @mousedown="onGridMouseDown">
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
                isDark ? 'border-gray-600' : 'border-gray-200',
                isCellInSelection(rowIdx, colIdx) ? (isDark ? 'bg-blue-900/40' : 'bg-blue-100/60') : '',
                isActiveCell(rowIdx, colIdx) ? (isDark ? 'ring-1 ring-inset ring-blue-400' : 'ring-1 ring-inset ring-blue-500') : '',
                isSelectionTopEdge(rowIdx, colIdx) ? 'border-t-2 border-t-blue-500' : '',
                isSelectionBottomEdge(rowIdx, colIdx) ? 'border-b-2 border-b-blue-500' : '',
                isSelectionLeftEdge(rowIdx, colIdx) ? 'border-l-2 border-l-blue-500' : '',
                isSelectionRightEdge(rowIdx, colIdx) ? 'border-r-2 border-r-blue-500' : '',
              ]"
              :style="getColumnStyle(col)"
              :data-builder-row="rowIdx"
              :data-builder-col="colIdx"
            >
              <LogbookBuilderCell
                :ref="(el) => setCellRef(rowIdx, col.id, el as { focus: () => void } | null)"
                :model-value="getCellValue(rowIdx, col.id)"
                :field-key="col.fieldKey"
                :category-class-value="col.categoryClassValue"
                :default-role="col.fieldKey === 'role' ? (grid.defaultImportRole?.value ?? 'PIC') : undefined"
                :suggestions="col.fieldKey === 'identification' ? identificationUsedOnPage : []"
                :builder-row="rowIdx"
                :builder-col="colIdx"
                @update:model-value="(v) => onCellInput(rowIdx, col.id, v)"
                @focus="onCellFocus(rowIdx, colIdx)"
                @blur="onCellBlur"
              />
              <button
                v-if="isHandleCell(rowIdx, colIdx)"
                type="button"
                class="absolute bottom-0 right-0 h-2 w-2 translate-x-1/2 translate-y-1/2 rounded-sm border border-blue-500 bg-blue-500 hover:bg-blue-600 dark:border-blue-300 dark:bg-blue-300 dark:hover:bg-blue-200 cursor-crosshair z-10"
                aria-label="Drag to fill"
                @mousedown="onFillHandleMouseDown"
              />
            </td>
            <td 
              :class="[
                'w-4 border-b border-l-4',
                isDark ? 'border-gray-500 bg-gray-700' : 'border-gray-400 bg-gray-200'
              ]"
              aria-hidden="true" 
            />
            <td
              v-for="(col, colIdx) in rightColumns"
              :key="col.id"
              :class="[
                'relative border p-0 text-center',
                isDark ? 'border-gray-600' : 'border-gray-200',
                isCellInSelection(rowIdx, splitIndex + colIdx) ? (isDark ? 'bg-blue-900/40' : 'bg-blue-100/60') : '',
                isActiveCell(rowIdx, splitIndex + colIdx) ? (isDark ? 'ring-1 ring-inset ring-blue-400' : 'ring-1 ring-inset ring-blue-500') : '',
                isSelectionTopEdge(rowIdx, splitIndex + colIdx) ? 'border-t-2 border-t-blue-500' : '',
                isSelectionBottomEdge(rowIdx, splitIndex + colIdx) ? 'border-b-2 border-b-blue-500' : '',
                isSelectionLeftEdge(rowIdx, splitIndex + colIdx) ? 'border-l-2 border-l-blue-500' : '',
                isSelectionRightEdge(rowIdx, splitIndex + colIdx) ? 'border-r-2 border-r-blue-500' : '',
              ]"
              :style="getColumnStyle(col)"
              :data-builder-row="rowIdx"
              :data-builder-col="splitIndex + colIdx"
            >
              <LogbookBuilderCell
                :ref="(el) => setCellRef(rowIdx, col.id, el as { focus: () => void } | null)"
                :model-value="getCellValue(rowIdx, col.id)"
                :field-key="col.fieldKey"
                :category-class-value="col.categoryClassValue"
                :default-role="col.fieldKey === 'role' ? (grid.defaultImportRole?.value ?? 'PIC') : undefined"
                :suggestions="col.fieldKey === 'identification' ? identificationUsedOnPage : []"
                :builder-row="rowIdx"
                :builder-col="splitIndex + colIdx"
                @update:model-value="(v) => onCellInput(rowIdx, col.id, v)"
                @focus="onCellFocus(rowIdx, splitIndex + colIdx)"
                @blur="onCellBlur"
              />
              <button
                v-if="isHandleCell(rowIdx, splitIndex + colIdx)"
                type="button"
                class="absolute bottom-0 right-0 h-2 w-2 translate-x-1/2 translate-y-1/2 rounded-sm border border-blue-500 bg-blue-500 hover:bg-blue-600 dark:border-blue-300 dark:bg-blue-300 dark:hover:bg-blue-200 cursor-crosshair z-10"
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
                isDark ? 'border-gray-600' : 'border-gray-200',
                isCellInSelection(rowIdx, colIdx) ? (isDark ? 'bg-blue-900/40' : 'bg-blue-100/60') : '',
                isActiveCell(rowIdx, colIdx) ? (isDark ? 'ring-1 ring-inset ring-blue-400' : 'ring-1 ring-inset ring-blue-500') : '',
                isSelectionTopEdge(rowIdx, colIdx) ? 'border-t-2 border-t-blue-500' : '',
                isSelectionBottomEdge(rowIdx, colIdx) ? 'border-b-2 border-b-blue-500' : '',
                isSelectionLeftEdge(rowIdx, colIdx) ? 'border-l-2 border-l-blue-500' : '',
                isSelectionRightEdge(rowIdx, colIdx) ? 'border-r-2 border-r-blue-500' : '',
              ]"
              :style="getColumnStyle(col)"
              :data-builder-row="rowIdx"
              :data-builder-col="colIdx"
            >
              <LogbookBuilderCell
                :ref="(el) => setCellRef(rowIdx, col.id, el as { focus: () => void } | null)"
                :model-value="getCellValue(rowIdx, col.id)"
                :field-key="col.fieldKey"
                :category-class-value="col.categoryClassValue"
                :default-role="col.fieldKey === 'role' ? (grid.defaultImportRole?.value ?? 'PIC') : undefined"
                :suggestions="col.fieldKey === 'identification' ? identificationUsedOnPage : []"
                :builder-row="rowIdx"
                :builder-col="colIdx"
                @update:model-value="(v) => onCellInput(rowIdx, col.id, v)"
                @focus="onCellFocus(rowIdx, colIdx)"
                @blur="onCellBlur"
              />
              <button
                v-if="isHandleCell(rowIdx, colIdx)"
                type="button"
                class="absolute bottom-0 right-0 h-2 w-2 translate-x-1/2 translate-y-1/2 rounded-sm border border-blue-500 bg-blue-500 hover:bg-blue-600 dark:border-blue-300 dark:bg-blue-300 dark:hover:bg-blue-200 cursor-crosshair z-10"
                aria-label="Drag to fill"
                @mousedown="onFillHandleMouseDown"
              />
            </td>
          </template>
          <td
            :class="[
              'border p-0.5 text-center',
              isDark ? 'border-gray-600' : 'border-gray-200'
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
