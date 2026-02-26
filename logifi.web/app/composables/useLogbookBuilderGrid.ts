import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type { BuilderColumn, BuilderRow, BuilderLayout, BuilderTemplateColumn } from '~/utils/logbookBuilderTypes'
import {
  DEFAULT_BUILDER_ROW_COUNT,
  DEFAULT_BUILDER_COLUMNS,
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_TAGS_COLUMN_WIDTH,
  createBuilderColumn,
  createEmptyBuilderRow,
} from '~/utils/logbookBuilderTypes'
import type { LogbookColumnKey } from '~/utils/logbookTypes'

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
  pilots: 'Pilots',
  role: 'Role',
  total: 'Total',
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

  function setCell(rowIdx: number, colId: string, value: string) {
    if (rowIdx < 0 || rowIdx >= rows.value.length) return
    const row = rows.value[rowIdx]
    if (!row.cells) row.cells = {}
    row.cells[colId] = value
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
  }

  function clearGrid() {
    const ids = columnIds.value
    rows.value = Array.from({ length: rowCount.value }, () => createEmptyBuilderRow(ids))
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
    setColumnWidth,
    setTagsColumnWidth,
    MIN_COLUMN_WIDTH,
    MAX_COLUMN_WIDTH,
    visibleColumns,
    columnIds,
    setCell,
    setRowTags,
    setRowCount,
    addRow,
    addColumn,
    removeColumn,
    updateColumn,
    reorderColumns,
    loadTemplate,
    clearGrid,
  }
}
