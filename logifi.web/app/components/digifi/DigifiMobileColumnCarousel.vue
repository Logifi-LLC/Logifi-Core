<script setup lang="ts">
import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import {
  focusedColumnIndexFromScroll,
  markColumnReviewed,
} from '~/utils/digifiMobileReview'

const grid = inject<ReturnType<typeof useLogbookBuilderGrid>>('logbookBuilderGrid')
if (!grid) throw new Error('DigifiMobileColumnCarousel requires logbookBuilderGrid')

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

function stride(): number {
  const el = scroller.value
  if (!el || columns.value.length === 0) return 0
  return el.scrollWidth / columns.value.length
}

function syncFromScroll() {
  const el = scroller.value
  if (!el) return
  focusedIndex.value = focusedColumnIndexFromScroll(el.scrollLeft, stride(), columns.value.length)
  markFocusedReviewed()
}

function scrollToIndex(index: number) {
  const el = scroller.value
  if (!el) return
  const next = Math.min(columns.value.length - 1, Math.max(0, index))
  focusedIndex.value = next
  el.scrollTo({ left: next * stride(), behavior: 'smooth' })
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
  <div class="space-y-3">
    <div class="flex items-baseline justify-between gap-2">
      <p class="text-sm font-semibold text-slate-100">
        {{ focusedColumn?.label ?? 'Column' }}
      </p>
      <p class="text-xs text-slate-500">
        {{ focusedIndex + 1 }}/{{ columns.length }}
      </p>
    </div>

    <div
      ref="scroller"
      class="flex snap-x snap-mandatory overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      @scroll.passive="syncFromScroll"
    >
      <section
        v-for="(column, index) in columns"
        :key="column.id"
        class="w-[78%] shrink-0 snap-center px-[3%]"
      >
        <div
          class="rounded-2xl border bg-slate-900/80 p-3 transition-[opacity,filter,transform] duration-200"
          :class="
            index === focusedIndex
              ? 'border-white/20 opacity-100'
              : 'border-white/5 opacity-40 blur-[2px] scale-[0.96]'
          "
        >
          <p class="mb-2 truncate text-xs font-semibold uppercase tracking-wide text-slate-400">
            {{ column.label }}
          </p>
          <ol class="max-h-[55dvh] space-y-2 overflow-y-auto">
            <li
              v-for="(_, rowIdx) in grid.rows.value"
              :key="`${column.id}-${rowIdx}`"
              class="flex items-center gap-2"
            >
              <span class="w-6 shrink-0 text-right font-mono text-[11px] tabular-nums text-slate-500">
                {{ rowIdx + 1 }}
              </span>
              <input
                :value="grid.rows.value[rowIdx]?.cells?.[column.id] ?? ''"
                type="text"
                inputmode="text"
                autocomplete="off"
                :aria-label="`${column.label} row ${rowIdx + 1}`"
                class="min-w-0 flex-1 rounded-lg border bg-slate-950/80 px-2.5 py-2 text-sm text-slate-100"
                :class="
                  cellNeedsReview(rowIdx, column.id)
                    ? 'border-amber-400/70'
                    : 'border-white/10'
                "
                @input="onCellInput(rowIdx, column.id, $event)"
              >
            </li>
          </ol>
        </div>
      </section>
    </div>

    <div class="flex justify-center gap-1.5">
      <button
        v-for="(column, index) in columns"
        :key="`dot-${column.id}`"
        type="button"
        class="h-2 rounded-full transition-all"
        :class="[
          index === focusedIndex ? 'w-5 bg-orange-400' : 'w-2 bg-white/25',
          reviewedIds.has(column.id) ? '' : 'opacity-50',
        ]"
        :aria-label="column.label"
        @click="scrollToIndex(index)"
      />
    </div>
  </div>
</template>
