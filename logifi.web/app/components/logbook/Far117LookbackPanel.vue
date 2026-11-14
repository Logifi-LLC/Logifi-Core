<template>
  <p
    v-if="line"
    data-testid="far117-lookback-line"
    :data-lookback="side"
    :class="[
      'text-xs font-quicksand shrink-0',
      align === 'right' ? 'md:text-right' : align === 'center' ? 'text-center' : 'md:text-left',
      isDarkMode ? 'text-gray-500' : 'text-gray-500',
      extraClass,
    ]"
    :title="line.title"
    :aria-label="line.ariaLabel"
  >
    {{ line.text }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  FAR117_LOOKBACK_INFO_NOTE,
  type Far117FlightTimeLookbacks,
} from '~/utils/far117FlightTimeLookback'

const props = defineProps<{
  side: '672' | '365'
  lookbacks: Far117FlightTimeLookbacks
  isDarkMode: boolean
  align?: 'left' | 'right' | 'center'
  extraClass?: string
}>()

function formatUsed(value: number): string {
  return value.toFixed(1)
}

function formatLimit(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

const line = computed(() => {
  const baseNote = FAR117_LOOKBACK_INFO_NOTE
  if (props.side === '672') {
    const row = props.lookbacks.consecutive672Hours
    let title = baseNote
    if (row.usedWholeDayApproximation) {
      title +=
        ' Some legs without OOOI out used whole calendar days in the 672-hour window.'
    }
    const text = `672h · ${formatUsed(row.usedHours)} / ${formatLimit(row.limitHours)}`
    return {
      text,
      title,
      ariaLabel: `672-hour FAR 117 lookback, ${text}. ${title}`,
    }
  }
  const row = props.lookbacks.consecutive365CalendarDays
  const text = `365d · ${formatUsed(row.usedHours)} / ${formatLimit(row.limitHours)}`
  return {
    text,
    title: baseNote,
    ariaLabel: `365-day FAR 117 lookback, ${text}. ${baseNote}`,
  }
})
</script>