import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type { BuilderColumn, BuilderRow, BuilderLayout, BuilderTemplateColumn } from '~/utils/logbookBuilderTypes'
import { supabase } from '~/lib/supabase'
import {
  DEFAULT_BUILDER_ROW_COUNT,
  DEFAULT_BUILDER_COLUMNS,
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_TAGS_COLUMN_WIDTH,
  createBuilderColumn,
  createEmptyBuilderRow,
} from '~/utils/logbookBuilderTypes'
import type { LogbookColumnKey } from '~/utils/logbookTypes'
import type { DigifiPageSide, DigifiScanCellMeta, DigifiScanRow, DigifiScanStrategy } from '~/utils/digifiTypes'
import { createBuilderSpreadId } from '~/utils/logbookBuilderDraft'

const FIELD_LABELS: Record<LogbookColumnKey, string> = {
  date: 'Date',
  aircraft: 'Aircraft',
  identification: 'Identification',
  flightNumber: 'Flight Number',
  fromTo: 'From → To',
  departure: 'From',
  destination: 'To',
  route: 'Route',
  simulator: 'Simulator',
  categoryClass: 'Category/Class',
  conditions: 'Conditions',
  remarks: 'Remarks',
  pic: 'PIC',
  sic: 'SIC',
  dualR: 'Dual R',
  solo: 'Solo',
  night: 'Night',
  actual: 'Actual',
  hood: 'Hood',
  dualG: 'Dual G',
  xc: 'XC',
  dayLandings: 'Day Landings',
  nightLandings: 'Night Landings',
  approach: 'Approach',
  approachType: 'Approach Type',
  pilots: 'Pilots',
  pilotRole: 'Pilot Role',
  role: 'Role',
  total: 'Total',
}

export interface ApplyScanResultsResult {
  filled: number
  baseRow: number
  allowedColumnIds: string[]
}

const MAX_UNDO_STACK = 50

export interface GridUndoSnapshot {
  rows: BuilderRow[]
  rowCount: number
}

function cloneBuilderRow(row: BuilderRow): BuilderRow {
  return {
    cells: { ...row.cells },
    tags: row.tags ? [...row.tags] : undefined,
    digifiCellMeta: row.digifiCellMeta
      ? Object.fromEntries(
          Object.entries(row.digifiCellMeta).map(([id, meta]) => [id, { ...meta }])
        )
      : undefined,
  }
}

export interface DigifiAppliedScanStatus {
  pageSide: DigifiPageSide
  expectedRowCount: number
  baseRow: number
  allowedColumnIds: string[]
  rowsReturned: number
  distinctRowIndices: number[]
  missingRowIndices: number[]
  duplicateRowIndices: number[]
  emptyRowIndices: number[]
  hasGaps: boolean
  strategyUsed: DigifiScanStrategy
  chunkCount: number
  rescueAttempted: boolean
  rescueRecoveredCount: number
}

export function useLogbookBuilderGrid() {
  const columns: Ref<BuilderColumn[]> = ref(
    DEFAULT_BUILDER_COLUMNS.map((c, i) =>
      createBuilderColumn({ ...c, order: i })
    )
  )
  const layout: Ref<BuilderLayout> = ref('single')
  const rowCount: Ref<number> = ref(DEFAULT_BUILDER_ROW_COUNT)
  /** Number of columns on the left page when layout is two-page (1 to columnCount-1). */
  const twoPageSplitIndex: Ref<number> = ref(2)
  /** Tags column width in pixels. */
  const tagsColumnWidth: Ref<number> = ref(DEFAULT_TAGS_COLUMN_WIDTH)
  /** Default role for builder imports when no Role column value (e.g. 'Dual Received' for student). */
  const defaultImportRole: Ref<string> = ref('Dual Received')
  /** Default year for date column when user enters MM/DD only (null = use current year). */
  const defaultYear: Ref<number | null> = ref(new Date().getFullYear())
  const MIN_COLUMN_WIDTH = 40
  const MAX_COLUMN_WIDTH = 500

  const visibleColumns = computed(() => [...columns.value].sort((a, b) => a.order - b.order))
  const effectiveSplitIndex = computed(() => {
    const n = visibleColumns.value.length
    if (n <= 1) return 1
    const s = twoPageSplitIndex.value
    return Math.min(Math.max(1, s), n - 1)
  })
  function setTwoPageSplitIndex(value: number) {
    const n = visibleColumns.value.length
    twoPageSplitIndex.value = Math.min(Math.max(1, value), n <= 1 ? 1 : n - 1)
  }
  const columnIds = computed(() => visibleColumns.value.map((c) => c.id))

  const rows: Ref<BuilderRow[]> = ref(
    Array.from({ length: rowCount.value }, () =>
      createEmptyBuilderRow(columnIds.value)
    )
  )

  /** Index of the row that currently has focus in the grid (for highlighting). */
  const activeRowIndex: Ref<number | null> = ref(null)

  /** After a left-page scan in single layout, right page rows start at this index. */
  const singleLayoutRightStartRow: Ref<number> = ref(0)
  const leftPageScanned: Ref<boolean> = ref(false)
  /** One credit covers left + right scans for this builder spread session. */
  const spreadId: Ref<string> = ref(createBuilderSpreadId())
  const digifiScanStatusByPage: Ref<Partial<Record<DigifiPageSide, DigifiAppliedScanStatus>>> = ref({})
  const undoStack: Ref<GridUndoSnapshot[]> = ref([])
  const redoStack: Ref<GridUndoSnapshot[]> = ref([])

  function captureUndoSnapshot(): GridUndoSnapshot {
    return {
      rows: rows.value.map(cloneBuilderRow),
      rowCount: rowCount.value,
    }
  }

  function restoreUndoSnapshot(snapshot: GridUndoSnapshot) {
    rows.value = snapshot.rows.map(cloneBuilderRow)
    rowCount.value = snapshot.rowCount
  }

  function pushUndoSnapshot() {
    undoStack.value.push(captureUndoSnapshot())
    if (undoStack.value.length > MAX_UNDO_STACK) {
      undoStack.value.shift()
    }
    redoStack.value = []
  }

  function undo(): boolean {
    if (undoStack.value.length === 0) return false
    redoStack.value.push(captureUndoSnapshot())
    const snapshot = undoStack.value.pop()
    if (!snapshot) return false
    restoreUndoSnapshot(snapshot)
    return true
  }

  function redo(): boolean {
    if (redoStack.value.length === 0) return false
    undoStack.value.push(captureUndoSnapshot())
    const snapshot = redoStack.value.pop()
    if (!snapshot) return false
    restoreUndoSnapshot(snapshot)
    return true
  }

  function clearUndoHistory() {
    undoStack.value = []
    redoStack.value = []
  }

  function regenerateSpreadId() {
    spreadId.value = createBuilderSpreadId()
  }

  function setActiveRowIndex(index: number | null) {
    activeRowIndex.value = index
  }

  function setCell(rowIdx: number, colId: string, value: string) {
    if (rowIdx < 0 || rowIdx >= rows.value.length) return
    const row = rows.value[rowIdx]
    if (!row.cells) row.cells = {}
    row.cells[colId] = value
  }

  function setDigifiCellMeta(rowIdx: number, colId: string, meta: DigifiScanCellMeta | null) {
    if (rowIdx < 0 || rowIdx >= rows.value.length) return
    const row = rows.value[rowIdx]
    if (!row.digifiCellMeta) row.digifiCellMeta = {}
    if (!meta) {
      delete row.digifiCellMeta[colId]
      return
    }
    row.digifiCellMeta[colId] = meta
  }

  function noteDigifiCellManualEdit(rowIdx: number, colId: string, value: string) {
    if (rowIdx < 0 || rowIdx >= rows.value.length) return
    const row = rows.value[rowIdx]
    const currentMeta = row.digifiCellMeta?.[colId]
    if (!currentMeta) return
    const nextValue = (value ?? '').trim()
    const resolvedValue = (currentMeta.resolvedValue ?? '').trim()
    if (!nextValue || nextValue === resolvedValue) return
    row.digifiCellMeta = {
      ...(row.digifiCellMeta ?? {}),
      [colId]: {
        ...currentMeta,
        userConfirmed: true,
        needsReview: false,
      },
    }
  }

  function setRowTags(rowIdx: number, tags: string[]) {
    if (rowIdx < 0 || rowIdx >= rows.value.length) return
    rows.value[rowIdx].tags = tags.filter(Boolean)
  }

  function setRowCount(n: number) {
    const prev = rows.value.length
    if (n === prev) return
    if (n > prev) {
      const ids = columnIds.value
      for (let i = prev; i < n; i++) {
        rows.value.push(createEmptyBuilderRow(ids))
      }
    } else {
      rows.value = rows.value.slice(0, n)
    }
    rowCount.value = n
  }

  function addRow(count = 1) {
    setRowCount(rows.value.length + count)
  }

  function addColumn(fieldKey: LogbookColumnKey | null = null) {
    const label = fieldKey ? FIELD_LABELS[fieldKey] : 'Notes'
    const newCol = createBuilderColumn({
      fieldKey,
      label,
      order: columns.value.length,
      width: DEFAULT_COLUMN_WIDTH,
    })
    columns.value.push(newCol)
    for (const row of rows.value) {
      row.cells[newCol.id] = ''
    }
  }

  function removeColumn(colId: string) {
    columns.value = columns.value.filter((c) => c.id !== colId)
    for (const row of rows.value) {
      if (row.cells) delete row.cells[colId]
    }
  }

  function updateColumn(colId: string, updates: Partial<Pick<BuilderColumn, 'fieldKey' | 'label' | 'order' | 'width' | 'categoryClassValue'>>) {
    const col = columns.value.find((c) => c.id === colId)
    if (!col) return
    if (updates.fieldKey !== undefined) col.fieldKey = updates.fieldKey
    if (updates.label !== undefined) col.label = updates.label
    if (updates.order !== undefined) col.order = updates.order
    if (updates.width !== undefined) col.width = updates.width
    if (updates.categoryClassValue !== undefined) col.categoryClassValue = updates.categoryClassValue
  }

  function setColumnWidth(colId: string, widthPx: number) {
    const w = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, widthPx))
    updateColumn(colId, { width: w })
  }

  function setTagsColumnWidth(widthPx: number) {
    tagsColumnWidth.value = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, widthPx))
  }

  function reorderColumns(orderedIds: string[]) {
    orderedIds.forEach((id, index) => {
      updateColumn(id, { order: index })
    })
  }

  function loadTemplate(template: { columns: BuilderTemplateColumn[]; layout: BuilderLayout; default_row_count?: number; tags_column_width?: number; default_import_role?: string; two_page_split_index?: number }) {
    const cols = template.columns
      .sort((a, b) => a.order - b.order)
      .map((c) => createBuilderColumn({ ...c, width: c.width ?? DEFAULT_COLUMN_WIDTH, categoryClassValue: c.categoryClassValue }))
    columns.value = cols
    layout.value = template.layout
    const n = template.default_row_count ?? DEFAULT_BUILDER_ROW_COUNT
    rowCount.value = n
    if (template.layout === 'two-page' && cols.length > 1) {
      if (template.two_page_split_index != null && template.two_page_split_index >= 1 && template.two_page_split_index <= cols.length - 1) {
        twoPageSplitIndex.value = template.two_page_split_index
      } else {
        twoPageSplitIndex.value = Math.min(Math.max(1, twoPageSplitIndex.value), cols.length - 1)
      }
    } else if (template.layout === 'two-page') {
      twoPageSplitIndex.value = Math.ceil(cols.length / 2) || 1
    }
    if (template.tags_column_width != null) {
      tagsColumnWidth.value = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, template.tags_column_width))
    }
    if (template.default_import_role != null && template.default_import_role !== '') {
      defaultImportRole.value = template.default_import_role
    }
    const ids = cols.map((c) => c.id)
    rows.value = Array.from({ length: n }, () => createEmptyBuilderRow(ids))
    resetDigifiPageState()
    regenerateSpreadId()
    clearUndoHistory()
  }

  function clearGrid() {
    const ids = columnIds.value
    rows.value = Array.from({ length: rowCount.value }, () => createEmptyBuilderRow(ids))
    singleLayoutRightStartRow.value = 0
    leftPageScanned.value = false
    digifiScanStatusByPage.value = {}
    regenerateSpreadId()
    clearUndoHistory()
  }

  function columnIdsForPageSide(pageSide: DigifiPageSide): string[] {
    const cols = visibleColumns.value
    if (layout.value !== 'two-page') {
      return cols.map((c) => c.id)
    }
    const split = effectiveSplitIndex.value
    if (pageSide === 'left') {
      return cols.slice(0, split).map((c) => c.id)
    }
    return cols.slice(split).map((c) => c.id)
  }

  function rowHasAnyCell(rowIdx: number, colIds?: string[]): boolean {
    const row = rows.value[rowIdx]
    if (!row?.cells) return false
    const ids = colIds ?? columnIds.value
    return ids.some((id) => (row.cells[id] ?? '').trim() !== '')
  }

  function findFirstEmptyRow(colIds: string[]): number {
    for (let i = 0; i < rows.value.length; i++) {
      if (!rowHasAnyCell(i, colIds)) return i
    }
    return rows.value.length
  }

  /**
   * Apply Digifi scan rows into the grid.
   * Two-page layout: left/right photos fill column halves on the same row indices.
   * Single layout: left photo fills from row 0; right photo fills from the next empty row block.
   */
  function applyScanResults(pageSide: DigifiPageSide, scanRows: DigifiScanRow[]): ApplyScanResultsResult {
    pushUndoSnapshot()
    const allowedColIds = new Set(columnIdsForPageSide(pageSide))
    let filled = 0

    let baseRow = 0
    if (layout.value === 'single' && pageSide === 'right') {
      baseRow = singleLayoutRightStartRow.value > 0
        ? singleLayoutRightStartRow.value
        : findFirstEmptyRow([...allowedColIds])
    }

    for (const scanRow of scanRows) {
      const gridRowIdx = baseRow + scanRow.rowIndex
      if (gridRowIdx < 0 || gridRowIdx >= rows.value.length) continue

      for (const [colId, value] of Object.entries(scanRow.cells)) {
        if (!allowedColIds.has(colId)) continue
        const v = (value ?? '').trim()
        if (!v) continue
        setCell(gridRowIdx, colId, v)
        setDigifiCellMeta(gridRowIdx, colId, scanRow.cellMeta?.[colId] ?? null)
        filled++
      }

      if (scanRow.tags?.length) {
        const existing = rows.value[gridRowIdx].tags ?? []
        const merged = Array.from(new Set([...existing, ...scanRow.tags.map((t) => t.trim()).filter(Boolean)]))
        setRowTags(gridRowIdx, merged)
      }
    }

    if (layout.value === 'single' && pageSide === 'left') {
      leftPageScanned.value = true
      let maxUsed = -1
      for (const scanRow of scanRows) {
        const idx = scanRow.rowIndex
        const hasData = Object.values(scanRow.cells).some((v) => (v ?? '').trim() !== '')
        if (hasData) maxUsed = Math.max(maxUsed, idx)
      }
      singleLayoutRightStartRow.value = maxUsed >= 0 ? maxUsed + 1 : findFirstEmptyRow([...allowedColIds])
    }

    if (pageSide === 'left') {
      leftPageScanned.value = true
    }

    return {
      filled,
      baseRow,
      allowedColumnIds: [...allowedColIds],
    }
  }

  function recordDigifiScanStatus(status: DigifiAppliedScanStatus) {
    digifiScanStatusByPage.value = {
      ...digifiScanStatusByPage.value,
      [status.pageSide]: status,
    }
  }

  function clearDigifiScanStatus(pageSide?: DigifiPageSide) {
    if (!pageSide) {
      digifiScanStatusByPage.value = {}
      return
    }
    const next = { ...digifiScanStatusByPage.value }
    delete next[pageSide]
    digifiScanStatusByPage.value = next
  }

  function getDigifiImportBlockers(): string[] {
    const issues: string[] = []
    for (const status of Object.values(digifiScanStatusByPage.value)) {
      if (!status) continue
      const unresolved = new Set<number>()
      for (const rowIndex of status.missingRowIndices) {
        const gridRowIdx = status.baseRow + rowIndex
        if (gridRowIdx < 0 || gridRowIdx >= rows.value.length) continue
        if (!rowHasAnyCell(gridRowIdx, status.allowedColumnIds)) {
          unresolved.add(gridRowIdx)
        }
      }
      if (unresolved.size === 0) continue
      const preview = [...unresolved]
        .sort((a, b) => a - b)
        .slice(0, 5)
        .map((i) => i + 1)
        .join(', ')
      const suffix = unresolved.size > 5 ? '…' : ''
      issues.push(
        `${status.pageSide === 'left' ? 'Left' : 'Right'} page still has unresolved Digifi rows at grid line(s) ${preview}${suffix}. Fill those rows manually before importing.`
      )
    }
    return issues
  }

  function resetDigifiPageState() {
    singleLayoutRightStartRow.value = 0
    leftPageScanned.value = false
    digifiScanStatusByPage.value = {}
  }

  /** Delete a saved template by id. Only removes the template record; does not touch logbook entries. */
  async function deleteTemplate(id: string): Promise<{ ok: boolean; error?: string }> {
    const { error } = await (supabase as any)
      .from('logbook_builder_templates')
      .delete()
      .eq('id', id)
    if (error) return { ok: false, error: error.message ?? 'Failed to delete template' }
    return { ok: true }
  }

  return {
    columns,
    rows,
    layout,
    rowCount,
    twoPageSplitIndex,
    effectiveSplitIndex,
    setTwoPageSplitIndex,
    tagsColumnWidth,
    defaultImportRole,
    defaultYear,
    activeRowIndex,
    setColumnWidth,
    setTagsColumnWidth,
    MIN_COLUMN_WIDTH,
    MAX_COLUMN_WIDTH,
    visibleColumns,
    columnIds,
    setCell,
    setRowTags,
    setDigifiCellMeta,
    noteDigifiCellManualEdit,
    setRowCount,
    addRow,
    addColumn,
    removeColumn,
    updateColumn,
    reorderColumns,
    loadTemplate,
    clearGrid,
    deleteTemplate,
    setActiveRowIndex,
    applyScanResults,
    leftPageScanned,
    spreadId,
    regenerateSpreadId,
    singleLayoutRightStartRow,
    digifiScanStatusByPage,
    recordDigifiScanStatus,
    clearDigifiScanStatus,
    getDigifiImportBlockers,
    resetDigifiPageState,
    pushUndoSnapshot,
    undo,
    redo,
    canUndo: computed(() => undoStack.value.length > 0),
    canRedo: computed(() => redoStack.value.length > 0),
  }
}
