<script setup lang="ts">
import { ref, inject, computed } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { DEFAULT_COLUMN_WIDTH } from '~/utils/logbookBuilderTypes'
import LogbookBuilderCell from './LogbookBuilderCell.vue'
import LogbookBuilderHeader from './LogbookBuilderHeader.vue'
import LogbookBuilderRowTags from './LogbookBuilderRowTags.vue'

const grid = inject<ReturnType<typeof useLogbookBuilderGrid>>('logbookBuilderGrid')
if (!grid) throw new Error('LogbookBuilderGrid must be used inside a page that provides logbookBuilderGrid')
const { visibleColumns, rows, setCell, setRowTags, updateColumn, layout, effectiveSplitIndex, setTwoPageSplitIndex, tagsColumnWidth, setColumnWidth, setTagsColumnWidth, MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH } = grid

function getColumnStyle(col: { width?: number }) {
  const w = col.width ?? DEFAULT_COLUMN_WIDTH
  return { width: `${w}px`, minWidth: `${w}px` }
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
    class="overflow-auto border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800 pb-4"
  >
    <table ref="tableRef" class="w-full border-collapse font-quicksand text-sm" style="table-layout: fixed">
      <thead class="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800">
        <tr>
          <template v-if="isTwoPage">
            <th
              v-for="col in leftColumns"
              :key="col.id"
              class="logbook-builder-data-col relative border border-gray-300 px-1.5 py-1 text-left text-xs font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-300"
              :class="['pic','sic','dualR','solo','night','actual','hood','dualG','xc','dayLandings','nightLandings','approach','total'].includes(col.fieldKey ?? '') || (col.fieldKey === 'categoryClass' && col.categoryClassValue) ? 'text-right' : ''"
              :style="getColumnStyle(col)"
            >
              <LogbookBuilderHeader :column="col" @update="(_, updates) => updateColumn(col.id, updates)" />
              <span
                class="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/50 dark:hover:bg-blue-500/50"
                title="Drag to resize column"
                @mousedown.prevent="startResize(col.id, $event.clientX, col.width ?? DEFAULT_COLUMN_WIDTH)"
            />
            </th>
            <th class="relative w-4 border-b border-l-4 border-gray-400 bg-gray-200 dark:border-gray-500 dark:bg-gray-700" aria-hidden="true">
              <div
                class="absolute inset-0 cursor-col-resize hover:bg-gray-300/80 dark:hover:bg-gray-600/80"
                title="Drag to move page break"
                @mousedown.prevent="startDividerDrag"
              />
            </th>
            <th
              v-for="col in rightColumns"
              :key="col.id"
              class="logbook-builder-data-col relative border border-gray-300 px-1.5 py-1 text-left text-xs font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-300"
              :class="['pic','sic','dualR','solo','night','actual','hood','dualG','xc','dayLandings','nightLandings','approach','total'].includes(col.fieldKey ?? '') || (col.fieldKey === 'categoryClass' && col.categoryClassValue) ? 'text-right' : ''"
              :style="getColumnStyle(col)"
            >
              <LogbookBuilderHeader :column="col" @update="(_, updates) => updateColumn(col.id, updates)" />
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
              class="relative border border-gray-300 px-1.5 py-1 text-left text-xs font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-300"
              :class="['pic','sic','dualR','solo','night','actual','hood','dualG','xc','dayLandings','nightLandings','approach','total'].includes(col.fieldKey ?? '') || (col.fieldKey === 'categoryClass' && col.categoryClassValue) ? 'text-right' : ''"
              :style="getColumnStyle(col)"
            >
              <LogbookBuilderHeader :column="col" @update="(_, updates) => updateColumn(col.id, updates)" />
              <span
                class="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/50 dark:hover:bg-blue-500/50"
                title="Drag to resize column"
                @mousedown.prevent="startResize(col.id, $event.clientX, col.width ?? DEFAULT_COLUMN_WIDTH)"
            />
            </th>
          </template>
          <th
            class="relative border border-gray-300 px-1.5 py-1 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:border-gray-600 dark:text-gray-300"
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
        <tr v-for="(row, rowIdx) in rows" :key="rowIdx">
          <template v-if="isTwoPage">
            <td
              v-for="(col, colIdx) in leftColumns"
              :key="col.id"
              class="border border-gray-300 p-0 dark:border-gray-600"
              :class="['pic','sic','dualR','solo','night','actual','hood','dualG','xc','dayLandings','nightLandings','approach','total'].includes(col.fieldKey ?? '') || (col.fieldKey === 'categoryClass' && col.categoryClassValue) ? 'text-right' : ''"
              :style="getColumnStyle(col)"
            >
              <LogbookBuilderCell
                :ref="(el) => setCellRef(rowIdx, col.id, el as { focus: () => void } | null)"
                :model-value="getCellValue(rowIdx, col.id)"
                :field-key="col.fieldKey"
                :category-class-value="col.categoryClassValue"
                :builder-row="rowIdx"
                :builder-col="colIdx"
                @update:model-value="(v) => onCellInput(rowIdx, col.id, v)"
              />
            </td>
            <td class="w-4 border-b border-l-4 border-gray-400 bg-gray-200 dark:border-gray-500 dark:bg-gray-700" aria-hidden="true" />
            <td
              v-for="(col, colIdx) in rightColumns"
              :key="col.id"
              class="border border-gray-300 p-0 dark:border-gray-600"
              :class="['pic','sic','dualR','solo','night','actual','hood','dualG','xc','dayLandings','nightLandings','approach','total'].includes(col.fieldKey ?? '') || (col.fieldKey === 'categoryClass' && col.categoryClassValue) ? 'text-right' : ''"
              :style="getColumnStyle(col)"
            >
              <LogbookBuilderCell
                :ref="(el) => setCellRef(rowIdx, col.id, el as { focus: () => void } | null)"
                :model-value="getCellValue(rowIdx, col.id)"
                :field-key="col.fieldKey"
                :category-class-value="col.categoryClassValue"
                :builder-row="rowIdx"
                :builder-col="splitIndex + colIdx"
                @update:model-value="(v) => onCellInput(rowIdx, col.id, v)"
              />
            </td>
          </template>
          <template v-else>
            <td
              v-for="(col, colIdx) in visibleColumns"
              :key="col.id"
              class="border border-gray-300 p-0 dark:border-gray-600"
              :class="['pic','sic','dualR','solo','night','actual','hood','dualG','xc','dayLandings','nightLandings','approach','total'].includes(col.fieldKey ?? '') || (col.fieldKey === 'categoryClass' && col.categoryClassValue) ? 'text-right' : ''"
              :style="getColumnStyle(col)"
            >
              <LogbookBuilderCell
                :ref="(el) => setCellRef(rowIdx, col.id, el as { focus: () => void } | null)"
                :model-value="getCellValue(rowIdx, col.id)"
                :field-key="col.fieldKey"
                :category-class-value="col.categoryClassValue"
                :builder-row="rowIdx"
                :builder-col="colIdx"
                @update:model-value="(v) => onCellInput(rowIdx, col.id, v)"
              />
            </td>
          </template>
          <td class="border border-gray-300 p-0.5 dark:border-gray-600" :style="{ width: tagsColumnWidth + 'px', minWidth: tagsColumnWidth + 'px' }">
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
