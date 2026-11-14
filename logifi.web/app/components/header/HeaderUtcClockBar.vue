<template>
  <div
    class="absolute inset-x-0 flex justify-center pointer-events-none min-w-0 px-16 sm:px-24"
    data-testid="header-utc-clock-bar"
  >
    <div
      class="flex max-w-full min-w-0 items-center justify-center gap-0.5 pointer-events-auto"
    >
      <span
        :class="[
          'px-2 py-0 shrink-0 rounded-md font-quicksand font-medium tabular-nums select-none leading-none',
          props.clockTextClass,
          props.compactClock ? 'text-sm' : 'text-sm sm:text-base',
        ]"
        aria-live="polite"
      >
        {{ displayClock }}
      </span>
      <Far117HeaderStatusDot
        v-if="showStatusDot"
        :lookbacks="lookbacks!"
        :is-dark-mode="isDarkMode"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import Far117HeaderStatusDot from '~/components/header/Far117HeaderStatusDot.vue'
import { useFar117HeaderLookbacks } from '~/composables/useFar117HeaderLookbacks'
import {
  far117LookbackRemainingState,
  far117LookbackWorstState,
  shouldShowFar117StatusDot,
} from '~/utils/far117LookbackRemainingState'

const props = withDefaults(
  defineProps<{
    displayClock: string
    isDarkMode: boolean
    compactClock?: boolean
    clockTextClass?: string
  }>(),
  {
    compactClock: false,
    clockTextClass: '',
  },
)

const {
  lookbacks,
  shouldShowFar117HeaderLookbacks,
  loadFar117LookbackPreference,
} = useFar117HeaderLookbacks()

const worstState = computed(() => {
  if (!lookbacks.value) return 'normal' as const
  const h672 = lookbacks.value.consecutive672Hours
  const d365 = lookbacks.value.consecutive365CalendarDays
  return far117LookbackWorstState(
    far117LookbackRemainingState(
      h672.remainingHours,
      h672.limitHours,
      h672.usedHours,
    ),
    far117LookbackRemainingState(
      d365.remainingHours,
      d365.limitHours,
      d365.usedHours,
    ),
  )
})

const showStatusDot = computed(
  () =>
    shouldShowFar117HeaderLookbacks.value &&
    lookbacks.value !== null &&
    shouldShowFar117StatusDot(worstState.value),
)

onMounted(() => {
  loadFar117LookbackPreference()
})
</script>