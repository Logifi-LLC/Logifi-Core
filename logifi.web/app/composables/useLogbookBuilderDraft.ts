import { watch, type Ref } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import {
  BUILDER_DRAFT_STORAGE_KEY,
  clearDraftStorage,
  columnsToTemplateColumns,
  draftHasContent,
  readDraftFromStorage,
  type LogbookBuilderDraft,
  writeDraftToStorage,
} from '~/utils/logbookBuilderDraft'
import { createBuilderColumn, createEmptyBuilderRow } from '~/utils/logbookBuilderTypes'

type Grid = ReturnType<typeof useLogbookBuilderGrid>

export function buildDraftFromGrid(grid: Grid): LogbookBuilderDraft {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    columns: columnsToTemplateColumns(grid.columns.value),
    layout: grid.layout.value,
    rowCount: grid.rowCount.value,
    twoPageSplitIndex: grid.twoPageSplitIndex.value,
    tagsColumnWidth: grid.tagsColumnWidth.value,
    defaultImportRole: grid.defaultImportRole.value,
    defaultYear: grid.defaultYear.value,
    rows: grid.rows.value.map((r) => ({
      cells: { ...r.cells },
      tags: r.tags ? [...r.tags] : undefined,
      digifiCellMeta: r.digifiCellMeta
        ? Object.fromEntries(
            Object.entries(r.digifiCellMeta).map(([colId, meta]) => [colId, { ...meta }])
          )
        : undefined,
    })),
    leftPageScanned: grid.leftPageScanned.value,
    singleLayoutRightStartRow: grid.singleLayoutRightStartRow.value,
  }
}

export function restoreDraftToGrid(grid: Grid, draft: LogbookBuilderDraft): void {
  const cols = draft.columns
    .sort((a, b) => a.order - b.order)
    .map((c) => createBuilderColumn({ ...c }))
  grid.columns.value = cols
  grid.layout.value = draft.layout
  grid.rowCount.value = draft.rowCount
  grid.twoPageSplitIndex.value = draft.twoPageSplitIndex
  grid.tagsColumnWidth.value = draft.tagsColumnWidth
  grid.defaultImportRole.value = draft.defaultImportRole
  grid.defaultYear.value = draft.defaultYear
  const ids = cols.map((c) => c.id)
  grid.rows.value = draft.rows.map((r) => {
    const row = createEmptyBuilderRow(ids)
    for (const id of ids) {
      row.cells[id] = r.cells?.[id] ?? ''
    }
    if (r.tags?.length) row.tags = [...r.tags]
    if (r.digifiCellMeta) {
      row.digifiCellMeta = Object.fromEntries(
        Object.entries(r.digifiCellMeta).map(([colId, meta]) => [colId, { ...meta }])
      )
    }
    return row
  })
  grid.leftPageScanned.value = draft.leftPageScanned
  grid.singleLayoutRightStartRow.value = draft.singleLayoutRightStartRow
}

let autosaveTimer: ReturnType<typeof setTimeout> | null = null
let autosaveSuspended = false

export function suspendDraftAutosave(): void {
  autosaveSuspended = true
}

export function resumeDraftAutosave(): void {
  autosaveSuspended = false
}

export function saveDraftNow(grid: Grid): void {
  const draft = buildDraftFromGrid(grid)
  if (!draftHasContent(draft)) {
    clearDraftStorage()
    return
  }
  writeDraftToStorage(draft)
}

export function clearBuilderDraft(): void {
  clearDraftStorage()
}

export function getStoredDraft(): LogbookBuilderDraft | null {
  return readDraftFromStorage()
}

export function storedDraftHasContent(): boolean {
  const draft = readDraftFromStorage()
  return draft != null && draftHasContent(draft)
}

/** Debounced autosave while the user edits the grid. */
export function setupBuilderDraftAutosave(grid: Grid, debounceMs = 500): () => void {
  const scheduleSave = () => {
    if (autosaveSuspended) return
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(() => {
      autosaveTimer = null
      saveDraftNow(grid)
    }, debounceMs)
  }

  const stopRows = watch(grid.rows, scheduleSave, { deep: true })
  const stopCols = watch(grid.columns, scheduleSave, { deep: true })
  const stopLayout = watch(grid.layout, scheduleSave)
  const stopRowCount = watch(grid.rowCount, scheduleSave)
  const stopSplit = watch(grid.twoPageSplitIndex, scheduleSave)
  const stopTagsW = watch(grid.tagsColumnWidth, scheduleSave)
  const stopRole = watch(grid.defaultImportRole, scheduleSave)
  const stopYear = watch(grid.defaultYear, scheduleSave)
  const stopLeft = watch(grid.leftPageScanned, scheduleSave)
  const stopRightStart = watch(grid.singleLayoutRightStartRow, scheduleSave)

  return () => {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    stopRows()
    stopCols()
    stopLayout()
    stopRowCount()
    stopSplit()
    stopTagsW()
    stopRole()
    stopYear()
    stopLeft()
    stopRightStart()
  }
}

export { BUILDER_DRAFT_STORAGE_KEY, draftHasContent }
