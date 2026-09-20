<script setup lang="ts">
import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { useTheme } from '~/composables/useTheme'
import {
  focusedColumnIndexFromScroll,
  markColumnReviewed,
} from '~/utils/digifiMobileReview'

const grid = inject<ReturnType<typeof useLogbookBuilderGrid>>('logbookBuilderGrid')
if (!grid) throw new Error('DigifiMobileColumnCarousel requires logbookBuilderGrid')

const { isDark: isDarkMode } = useTheme()

const scroller = ref<HTMLElement | null>(null)
const focusedIndex = ref(0)
const reviewedIds = ref<Set<string>>(new Set())

const columns = computed(() => grid.visibleColumns.value)
const focusedColumn = computed(() => columns.value[focusedIndex.value] ?? null)

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

function onCellInput(rowIdx: number, colId: string, event: Event) {
  const value = (event.target as HTMLInputElement).value
  grid.setCell(rowIdx, colId, value)
  grid.noteDigifiCellManualEdit(rowIdx, colId, value)
}

function cellNeedsReview(rowIdx: number, colId: string): boolean {
  return grid.rows.value[rowIdx]?.digifiCellMeta?.[colId]?.needsReview === true
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
  void nextTick(() => syncFromScroll())
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})

watch(
  () => columns.value.map((column) => column.id).join('|'),
  () => {
    focusedIndex.value = 0
    reviewedIds.value = new Set()
    void nextTick(() => {
      scroller.value?.scrollTo({ left: 0 })
      markFocusedReviewed()
    })
  }
)
</script>

<template>
  <div class="space-y-2">
    <p
      :class="[
        'min-h-[1.25rem] text-center text-base font-semibold tracking-tight',
        isDarkMode ? 'text-green-100' : 'text-green-900',
      ]"
    >
      {{ focusedColumn?.label ?? 'Column' }}
    </p>

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
              class="flex items-stretch border-b last:border-b-0"
              :class="isDarkMode ? 'border-white/10' : 'border-gray-200'"
            >
              <span
                :class="[
                  'flex w-7 shrink-0 items-center justify-end border-r px-1 font-mono text-[10px] tabular-nums',
                  isDarkMode ? 'border-white/10 bg-black/20 text-gray-500' : 'border-gray-200 bg-gray-100/80 text-gray-400',
                ]"
              >
                {{ rowIdx + 1 }}
              </span>
              <input
                :value="grid.rows.value[rowIdx]?.cells?.[column.id] ?? ''"
                type="text"
                inputmode="text"
                autocomplete="off"
                :aria-label="`${column.label} row ${rowIdx + 1}`"
                :class="[
                  'min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-inset',
                  isDarkMode ? 'text-gray-100 focus:ring-green-500/40' : 'text-gray-900 focus:ring-green-500/30',
                  cellNeedsReview(rowIdx, column.id)
                    ? isDarkMode
                      ? 'bg-amber-500/10 focus:ring-amber-400/50'
                      : 'bg-amber-50 focus:ring-amber-400/40'
                    : '',
                ]"
                @input="onCellInput(rowIdx, column.id, $event)"
              >
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
