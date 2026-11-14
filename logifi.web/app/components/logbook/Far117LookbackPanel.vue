<template>
  <div
    v-for="row in rows"
    :key="row.key"
    data-testid="far117-lookback-stat"
    :class="[
      'rounded-xl border text-left transition-all duration-300 relative overflow-hidden group',
      isIos ? 'px-3 py-3' : 'px-4 py-5',
      isDarkMode
        ? 'bg-white/5 border-white/10 hover:bg-white/10 shadow-sm shadow-black/20'
        : 'bg-gray-100 border-gray-200 hover:bg-gray-200 shadow-sm',
    ]"
  >
    <div class="relative z-10 flex items-start justify-between gap-1">
      <p
        :class="[
          'min-w-0 text-xs uppercase tracking-wider font-semibold font-quicksand',
          isDarkMode ? 'text-gray-400' : 'text-gray-500',
        ]"
      >
        {{ row.label }}
      </p>
      <button
        v-if="row.key === '672'"
        type="button"
        class="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        :title="infoTitle"
        aria-label="FAR 117 flight-time lookback information"
      >
        <Icon
          name="ri:information-line"
          class="h-4 w-4"
          :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
          aria-hidden="true"
        />
      </button>
    </div>
    <p
      :class="[
        'font-semibold font-quicksand mt-2 relative z-10',
        isIos ? 'text-xl' : 'text-2xl',
        isDarkMode ? 'text-gray-200' : 'text-gray-900',
      ]"
    >
      {{ row.used }} / {{ row.limit }}
    </p>
    <p
      :class="[
        'mt-1 text-xs font-quicksand relative z-10',
        isDarkMode ? 'text-gray-500' : 'text-gray-500',
      ]"
    >
      left {{ row.remaining }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Far117FlightTimeLookbacks } from '~/utils/far117FlightTimeLookback'

const props = defineProps<{
  lookbacks: Far117FlightTimeLookbacks
  isDarkMode: boolean
  isIos?: boolean
}>()

function formatHours(value: number): string {
  return value.toFixed(1)
}

const rows = computed(() => {
  const { consecutive672Hours, consecutive365CalendarDays } = props.lookbacks
  return [
    {
      key: '672',
      label: '672 h (117.23(b)(1))',
      used: formatHours(consecutive672Hours.usedHours),
      remaining: formatHours(consecutive672Hours.remainingHours),
      limit: formatHours(consecutive672Hours.limitHours),
      approximated: consecutive672Hours.usedWholeDayApproximation === true,
    },
    {
      key: '365',
      label: '365 days (117.23(b)(2))',
      used: formatHours(consecutive365CalendarDays.usedHours),
      remaining: formatHours(consecutive365CalendarDays.remainingHours),
      limit: formatHours(consecutive365CalendarDays.limitHours),
      approximated: false,
    },
  ]
})

const infoTitle = computed(() => {
  const parts = [
    'Informational only, not a legality check. Block time is entry Total; simulator entries excluded.',
  ]
  if (props.lookbacks.consecutive672Hours.usedWholeDayApproximation) {
    parts.push(
      'Some legs without OOOI out used whole calendar days in the 672-hour window.'
    )
  }
  return parts.join(' ')
})
</script>