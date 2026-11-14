<template>
  <section
    class="mt-4 rounded-xl border p-4"
    :class="isDarkMode ? 'border-white/10 bg-gray-900/60' : 'border-gray-200 bg-gray-50'"
    data-testid="far117-lookback-panel"
    aria-labelledby="far117-lookback-heading"
  >
    <h3
      id="far117-lookback-heading"
      class="text-xs font-semibold uppercase tracking-wider font-quicksand"
      :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
    >
      FAR 117 flight time
    </h3>
    <p
      class="mt-1 text-xs font-quicksand"
      :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
    >
      Informational only, not a legality check.
    </p>

    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      <div
        v-for="row in rows"
        :key="row.key"
        class="min-h-[44px] rounded-lg border px-3 py-2"
        :class="isDarkMode ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-white'"
      >
        <p class="text-xs font-medium font-quicksand" :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'">
          {{ row.title }}
          <span class="font-normal" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">({{ row.citation }})</span>
        </p>
        <p class="mt-1 text-xs font-quicksand" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
          <span :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'">{{ row.used }} h used</span>
          ·
          <span :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'">{{ row.remaining }} h left</span>
          of {{ row.limit }} h
        </p>
        <p
          v-if="row.footnote"
          class="mt-1 text-xs font-quicksand"
          :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
          :title="row.footnote"
        >
          {{ row.footnote }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Far117FlightTimeLookbacks } from '~/utils/far117FlightTimeLookback'

const props = defineProps<{
  lookbacks: Far117FlightTimeLookbacks
  isDarkMode: boolean
}>()

function formatHours(value: number): string {
  return value.toFixed(1)
}

const rows = computed(() => {
  const { consecutive672Hours, consecutive365CalendarDays } = props.lookbacks
  return [
    {
      key: '672',
      title: consecutive672Hours.windowLabel,
      citation: '117.23(b)(1)',
      used: formatHours(consecutive672Hours.usedHours),
      remaining: formatHours(consecutive672Hours.remainingHours),
      limit: formatHours(consecutive672Hours.limitHours),
      footnote: consecutive672Hours.usedWholeDayApproximation
        ? 'Some legs without OOOI out used whole calendar days in the 672-hour window.'
        : undefined,
    },
    {
      key: '365',
      title: consecutive365CalendarDays.windowLabel,
      citation: '117.23(b)(2)',
      used: formatHours(consecutive365CalendarDays.usedHours),
      remaining: formatHours(consecutive365CalendarDays.remainingHours),
      limit: formatHours(consecutive365CalendarDays.limitHours),
      footnote: undefined as string | undefined,
    },
  ]
})
</script>