<template>
  <p
    v-if="line"
    data-testid="far117-lookback-line"
    :data-lookback="side"
    :class="[
      'font-quicksand shrink-0 leading-none',
      compact ? 'text-xs' : 'text-xs',
      stateTextClass,
      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : '',
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
import {
  far117LookbackRemainingState,
  far117LookbackStateAriaPhrase,
  far117LookbackStateTextClass,
} from '~/utils/far117LookbackRemainingState'

const props = defineProps<{
  side: '672' | '365'
  lookbacks: Far117FlightTimeLookbacks
  isDarkMode: boolean
  align?: 'left' | 'right' | 'center'
  extraClass?: string
  compact?: boolean
}>()

function formatUsed(value: number): string {
  return value.toFixed(1)
}

function formatLimit(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

const rowState = computed(() => {
  const row =
    props.side === '672'
      ? props.lookbacks.consecutive672Hours
      : props.lookbacks.consecutive365CalendarDays
  return far117LookbackRemainingState(
    row.remainingHours,
    row.limitHours,
    row.usedHours,
  )
})

const stateTextClass = computed(() =>
  far117LookbackStateTextClass(rowState.value, props.isDarkMode),
)

const line = computed(() => {
  const baseNote = FAR117_LOOKBACK_INFO_NOTE
  const statePhrase = far117LookbackStateAriaPhrase(rowState.value)
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
      ariaLabel: `672-hour FAR 117 lookback, ${statePhrase}, ${text}. ${title}`,
    }
  }
  const row = props.lookbacks.consecutive365CalendarDays
  const text = `365d · ${formatUsed(row.usedHours)} / ${formatLimit(row.limitHours)}`
  return {
    text,
    title: baseNote,
    ariaLabel: `365-day FAR 117 lookback, ${statePhrase}, ${text}. ${baseNote}`,
  }
})
</script>