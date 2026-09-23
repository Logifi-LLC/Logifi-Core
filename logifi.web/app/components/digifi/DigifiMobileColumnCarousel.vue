<script setup lang="ts">
import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import LogbookBuilderCell from '~/components/logbook-builder/LogbookBuilderCell.vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { useTheme } from '~/composables/useTheme'
import type { LogbookColumnKey } from '~/utils/logbookTypes'
import {
  focusedColumnIndexFromScroll,
  markColumnReviewed,
} from '~/utils/digifiMobileReview'
import {
  computeDigifiMobileReviewRowMinHeights,
  mergeDigifiMobileReviewRowHeights,
} from '~/utils/digifiMobileReviewRows'

const props = defineProps<{
  remarksRescanOffers?: Array<{ rowIndex: number; focusRows: number[] }>
  rescanBusy?: boolean
}>()

const emit = defineEmits<{
  'rescan-remarks-band': [rowIndex: number]
}>()

const grid = inject<ReturnType<typeof useLogbookBuilderGrid>>('logbookBuilderGrid')
if (!grid) throw new Error('DigifiMobileColumnCarousel requires logbookBuilderGrid')

const builderPilots = inject<Ref<string[]>>('builderPilots', ref([]))

const { isDark: isDarkMode } = useTheme()

const activeEdit = ref<{ rowIdx: number; colId: string } | null>(null)

const scroller = ref<HTMLElement | null>(null)
const focusedIndex = ref(0)
const reviewedIds = ref<Set<string>>(new Set())

const columns = computed(() => grid.visibleColumns.value)
const focusedColumn = computed(() => columns.value[focusedIndex.value] ?? null)

const remarksRescanRowIndices = computed(() => {
  const indices = new Set<number>()
  for (const offer of props.remarksRescanOffers ?? []) {
    indices.add(offer.rowIndex)
  }
  return indices
})

const rowHeightsPx = ref<number[]>([])

const rowHeightFloorPx = computed(() =>
  computeDigifiMobileReviewRowMinHeights({
    rowCount: grid.rows.value.length,
    rows: grid.rows.value,
    columns: columns.value,
    remarksRescanRowIndices: remarksRescanRowIndices.value,
  })
)

let rowMeasureObserver: ResizeObserver | null = null
let rowMeasureRaf = 0

function measureRowHeightsFromDom(pass = 0) {
  const el = scroller.value
  const rowCount = grid.rows.value.length
  if (!el || rowCount === 0) {
    rowHeightsPx.value = []
    return
  }

  const measured = new Array<number>(rowCount).fill(0)
  const rowNodes = el.querySelectorAll<HTMLElement>('li[data-digifi-row]')
  rowNodes.forEach((node) => {
    const rowIdx = Number.parseInt(node.dataset.digifiRow ?? '', 10)
    if (!Number.isFinite(rowIdx) || rowIdx < 0 || rowIdx >= rowCount) return
    measured[rowIdx] = Math.max(measured[rowIdx], node.getBoundingClientRect().height)
  })

  const next = mergeDigifiMobileReviewRowHeights(rowCount, measured, rowHeightFloorPx.value)
  const changed = next.some((height, idx) => height !== rowHeightsPx.value[idx])
  rowHeightsPx.value = next
  if (changed && pass < 4) {
    requestAnimationFrame(() => measureRowHeightsFromDom(pass + 1))
  }
}

function scheduleRowHeightMeasure() {
  if (rowMeasureRaf) cancelAnimationFrame(rowMeasureRaf)
  rowMeasureRaf = requestAnimationFrame(() => {
    rowMeasureRaf = 0
    measureRowHeightsFromDom()
  })
}

function rowMinHeightStyle(rowIdx: number): string | undefined {
  const height = rowHeightsPx.value[rowIdx]
  if (!height) return undefined
  return `${height}px`
}

function markFocusedReviewed() {
  const column = focusedColumn.value
  if (!column) return
  reviewedIds.value = markColumnReviewed(reviewedIds.value, column.id)
}

function columnStride(): number {
  const el = scroller.value
  if (!el || columns.value.length === 0) return 0
  const firstSection = el.querySelector('[data-digifi-column]') as HTMLElement | null
  if (firstSection?.offsetWidth) return firstSection.offsetWidth
  return el.clientWidth * 0.58
}

function syncFromScroll() {
  const el = scroller.value
  if (!el) return
  const stride = columnStride()
  focusedIndex.value = focusedColumnIndexFromScroll(el.scrollLeft, stride, columns.value.length)
  markFocusedReviewed()
}

function scrollToIndex(index: number) {
  const el = scroller.value
  if (!el) return
  const next = Math.min(columns.value.length - 1, Math.max(0, index))
  focusedIndex.value = next
  el.scrollTo({ left: next * columnStride(), behavior: 'smooth' })
  markFocusedReviewed()
}

function onColumnSelectChange(event: Event) {
  const index = Number.parseInt((event.target as HTMLSelectElement).value, 10)
  if (!Number.isFinite(index)) return
  scrollToIndex(index)
}

function onCellInput(rowIdx: number, colId: string, value: string) {
  grid.setCell(rowIdx, colId, value)
  grid.noteDigifiCellManualEdit(rowIdx, colId, value)
}

function cellSuggestions(fieldKey: LogbookColumnKey | null): string[] {
  if (fieldKey === 'pilots') return builderPilots.value ?? []
  return []
}

function isCellEditing(rowIdx: number, colId: string, fieldKey: LogbookColumnKey | null): boolean {
  if (fieldKey === 'pilots' || fieldKey === 'role' || fieldKey === 'pilotRole') return true
  return activeEdit.value?.rowIdx === rowIdx && activeEdit.value?.colId === colId
}

function onCellFocus(rowIdx: number, colId: string) {
  activeEdit.value = { rowIdx, colId }
}

function onCellBlur() {
  activeEdit.value = null
}

function cellNeedsReview(rowIdx: number, colId: string): boolean {
  return grid.rows.value[rowIdx]?.digifiCellMeta?.[colId]?.needsReview === true
}

function remarksRescanOfferForRow(rowIdx: number) {
  return props.remarksRescanOffers?.some((offer) => offer.rowIndex === rowIdx) ?? false
}

function columnStripClass(index: number): string {
  const focused = index === focusedIndex.value
  if (isDarkMode.value) {
    return focused
      ? 'bg-gray-900 opacity-100 ring-1 ring-inset ring-green-500/35'
      : 'bg-gray-950/40 opacity-70'
  }
  return focused
    ? 'bg-white opacity-100 ring-1 ring-inset ring-green-500/25'
    : 'bg-gray-50/90 opacity-75'
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    scrollToIndex(focusedIndex.value + 1)
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    scrollToIndex(focusedIndex.value - 1)
  }
}

onMounted(() => {
  markFocusedReviewed()
  window.addEventListener('keydown', onKeydown)
  void nextTick(() => {
    syncFromScroll()
    scheduleRowHeightMeasure()
    const el = scroller.value
    if (el && typeof ResizeObserver !== 'undefined') {
      rowMeasureObserver = new ResizeObserver(() => scheduleRowHeightMeasure())
      rowMeasureObserver.observe(el)
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  rowMeasureObserver?.disconnect()
  rowMeasureObserver = null
  if (rowMeasureRaf) cancelAnimationFrame(rowMeasureRaf)
})

watch(
  () => columns.value.map((column) => column.id).join('|'),
  () => {
    focusedIndex.value = 0
    reviewedIds.value = new Set()
    void nextTick(() => {
      scroller.value?.scrollTo({ left: 0 })
      markFocusedReviewed()
      scheduleRowHeightMeasure()
    })
  }
)

watch(
  () => [
    grid.rows.value.length,
    grid.rows.value.map((row) => JSON.stringify(row.cells)).join('\n'),
    props.remarksRescanOffers?.map((o) => o.rowIndex).join(','),
  ],
  () => scheduleRowHeightMeasure(),
  { flush: 'post' }
)
</script>

<template>
  <div class="space-y-2">
    <label class="sr-only" for="digifi-review-column-select">Column</label>
    <select
      id="digifi-review-column-select"
      :value="String(focusedIndex)"
      class="w-full rounded-2xl border px-4 py-2.5 text-sm font-semibold"
      :class="
        isDarkMode
          ? 'border-white/10 bg-white/5 text-green-100'
          : 'border-gray-200 bg-white text-green-900 shadow-sm'
      "
      aria-label="Column"
      @change="onColumnSelectChange"
    >
      <option v-for="(column, index) in columns" :key="column.id" :value="String(index)">
        {{ index + 1 }}. {{ column.label }}
      </option>
    </select>

    <div
      :class="[
        'overflow-hidden rounded-xl border',
        isDarkMode ? 'border-white/10 bg-gray-950' : 'border-gray-200 bg-white',
      ]"
    >
      <div
        ref="scroller"
        class="flex snap-x snap-mandatory overflow-x-auto scroll-px-[21%] pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        @scroll.passive="syncFromScroll"
      >
        <section
          v-for="(column, index) in columns"
          :key="column.id"
          data-digifi-column
          class="w-[58%] shrink-0 snap-center border-r transition-[opacity,background-color] duration-200 last:border-r-0"
          :class="[
            isDarkMode ? 'border-white/10' : 'border-gray-200',
            columnStripClass(index),
          ]"
        >
          <ol>
            <li
              v-for="(_, rowIdx) in grid.rows.value"
              :key="`${column.id}-${rowIdx}`"
              :data-digifi-row="String(rowIdx)"
              class="flex items-stretch border-b last:border-b-0"
              :class="isDarkMode ? 'border-white/10' : 'border-gray-200'"
              :style="rowMinHeightStyle(rowIdx) ? { minHeight: rowMinHeightStyle(rowIdx) } : undefined"
            >
              <span
                :class="[
                  'flex w-7 shrink-0 items-center justify-end border-r px-1 font-mono text-[10px] tabular-nums',
                  isDarkMode ? 'border-white/10 bg-black/20 text-gray-500' : 'border-gray-200 bg-gray-100/80 text-gray-400',
                ]"
              >
                {{ rowIdx + 1 }}
              </span>
              <div
                data-digifi-row-content
                class="flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-hidden"
                :class="
                  cellNeedsReview(rowIdx, column.id)
                    ? isDarkMode
                      ? 'bg-amber-500/10'
                      : 'bg-amber-50'
                    : ''
                "
              >
                <LogbookBuilderCell
                  row-lock
                  :model-value="grid.rows.value[rowIdx]?.cells?.[column.id] ?? ''"
                  :field-key="column.fieldKey"
                  :category-class-value="column.categoryClassValue"
                  :default-role="
                    column.fieldKey === 'role' ? (grid.defaultImportRole.value ?? 'PIC') : undefined
                  "
                  :suggestions="cellSuggestions(column.fieldKey)"
                  :builder-row="rowIdx"
                  :builder-col="index"
                  :is-editing="isCellEditing(rowIdx, column.id, column.fieldKey)"
                  @update:model-value="(v) => onCellInput(rowIdx, column.id, v)"
                  @focus="onCellFocus(rowIdx, column.id)"
                  @blur="onCellBlur"
                />
                <button
                  v-if="
                    column.fieldKey === 'remarks' &&
                    (remarksRescanOfferForRow(rowIdx) || cellNeedsReview(rowIdx, column.id))
                  "
                  type="button"
                  class="mx-2 mb-1 block rounded-lg px-2 py-1 text-left text-[11px] font-semibold text-green-700 underline-offset-2 hover:underline disabled:opacity-50 dark:text-green-300"
                  :disabled="rescanBusy"
                  @click="emit('rescan-remarks-band', rowIdx)"
                >
                  Re-scan remarks (uses 1 credit)
                </button>
              </div>
            </li>
          </ol>
        </section>
        <div
          class="w-[21%] shrink-0 snap-none"
          aria-hidden="true"
        />
      </div>
    </div>
  </div>
</template>
