<template>
  <section
    v-if="progress"
    class="mt-4 rounded-xl border px-4 py-3"
    :class="isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'"
    aria-label="ATP progress"
  >
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <h3
        :class="[
          'text-xs font-semibold uppercase tracking-wide font-quicksand',
          isDarkMode ? 'text-gray-400' : 'text-gray-500',
        ]"
      >
        ATP experience (airplane)
      </h3>
      <div
        class="inline-flex rounded-lg border p-0.5 gap-0.5"
        :class="isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-200'"
        role="group"
        aria-label="Certificate track"
      >
        <button
          v-for="opt in trackOptions"
          :key="opt.id"
          type="button"
          class="px-2 py-1 text-xs font-quicksand rounded-md transition-colors min-h-[32px]"
          :class="
            track === opt.id
              ? isDarkMode
                ? 'bg-gray-700 text-white'
                : 'bg-gray-50 text-gray-900'
              : isDarkMode
                ? 'text-gray-400 hover:text-gray-200'
                : 'text-gray-600 hover:text-gray-900'
          "
          @click="track = opt.id"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
    <ul class="space-y-3">
      <li v-for="row in progress.rows" :key="row.key">
        <div class="flex items-baseline justify-between gap-2 mb-1">
          <span :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-800']">
            {{ row.label }}
          </span>
          <span
            :class="['text-xs font-mono tabular-nums', isDarkMode ? 'text-gray-400' : 'text-gray-600']"
          >
            {{ formatHours(row.actualHours) }} / {{ formatHours(row.requiredHours) }}
          </span>
        </div>
        <div
          class="h-1.5 rounded-full overflow-hidden"
          :class="isDarkMode ? 'bg-gray-700' : 'bg-gray-300'"
        >
          <div
            class="h-full rounded-full transition-[width]"
            :class="isDarkMode ? 'bg-blue-500/80' : 'bg-blue-600/90'"
            :style="{ width: `${barWidth(row)}%` }"
          />
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LogEntry } from '~/utils/logbookTypes'
import { ATP_TRACK_OPTIONS, type AtpTrackId } from '~/utils/atpRequirements'
import { buildAtpProgress, progressPercent } from '~/utils/atpProgress'
import { calculateTotalsReport } from '~/utils/totalsReport'

const props = defineProps<{
  entries: LogEntry[]
  isDarkMode: boolean
}>()

const track = ref<AtpTrackId>('atp')
const trackOptions = ATP_TRACK_OPTIONS

const progress = computed(() => {
  if (!props.entries.length) return null
  const report = calculateTotalsReport(props.entries, 'all')
  return buildAtpProgress(report.grandTotal.airplane, track.value)
})

function formatHours(n: number): string {
  return n.toFixed(1)
}

function barWidth(row: { actualHours: number; requiredHours: number }): number {
  return progressPercent(row.actualHours, row.requiredHours)
}
</script>