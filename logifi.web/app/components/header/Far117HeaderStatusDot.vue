<template>
  <div
    class="relative shrink-0"
    data-testid="far117-header-status-dot"
    @mouseenter="setPopoverOpen(true)"
    @mouseleave="setPopoverOpen(false)"
  >
    <button
      type="button"
      class="relative flex items-center justify-center min-h-[44px] min-w-[44px] -m-3 p-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
      :aria-label="buttonAriaLabel"
      :aria-expanded="popoverOpen ? 'true' : 'false'"
      aria-haspopup="dialog"
      @click="popoverOpen = !popoverOpen"
      @focus="setPopoverOpen(true)"
      @blur="onButtonBlur"
    >
      <span
        class="block h-2 w-2 rounded-full shrink-0"
        :class="dotClass"
        aria-hidden="true"
      />
    </button>
    <div
      v-show="popoverOpen"
      data-testid="far117-header-status-popover"
      role="dialog"
      :class="[
        'absolute left-1/2 top-full z-[60] mt-1 w-max max-w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border px-3 py-2 text-left shadow-md',
        isDarkMode
          ? 'border-white/10 bg-gray-900 text-gray-200'
          : 'border-gray-200 bg-white text-gray-900',
      ]"
      @mousedown.prevent
    >
      <div class="flex flex-col gap-1">
        <Far117LookbackPanel
          side="672"
          :lookbacks="lookbacks"
          :is-dark-mode="isDarkMode"
        />
        <Far117LookbackPanel
          side="365"
          :lookbacks="lookbacks"
          :is-dark-mode="isDarkMode"
        />
      </div>
      <p
        :class="[
          'mt-2 text-xs font-quicksand leading-snug',
          isDarkMode ? 'text-gray-500' : 'text-gray-500',
        ]"
      >
        {{ infoNote }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Far117LookbackPanel from '~/components/logbook/Far117LookbackPanel.vue'
import {
  FAR117_LOOKBACK_INFO_NOTE,
  type Far117FlightTimeLookbacks,
} from '~/utils/far117FlightTimeLookback'
import {
  far117LookbackDotBgClass,
  far117LookbackRemainingState,
  far117LookbackStateAriaPhrase,
  far117LookbackWorstState,
} from '~/utils/far117LookbackRemainingState'

const props = defineProps<{
  lookbacks: Far117FlightTimeLookbacks
  isDarkMode: boolean
}>()

const popoverOpen = ref(false)

function setPopoverOpen(open: boolean): void {
  popoverOpen.value = open
}

function onButtonBlur(event: FocusEvent): void {
  const related = event.relatedTarget as Node | null
  if (related && (event.currentTarget as HTMLElement).parentElement?.contains(related)) {
    return
  }
  setPopoverOpen(false)
}

function formatLine(
  prefix: '672h' | '365d',
  used: number,
  limit: number,
): string {
  const limitText = Number.isInteger(limit) ? String(limit) : limit.toFixed(1)
  return `${prefix} · ${used.toFixed(1)} / ${limitText}`
}

const state672 = computed(() =>
  far117LookbackRemainingState(
    props.lookbacks.consecutive672Hours.remainingHours,
    props.lookbacks.consecutive672Hours.limitHours,
    props.lookbacks.consecutive672Hours.usedHours,
  ),
)

const state365 = computed(() =>
  far117LookbackRemainingState(
    props.lookbacks.consecutive365CalendarDays.remainingHours,
    props.lookbacks.consecutive365CalendarDays.limitHours,
    props.lookbacks.consecutive365CalendarDays.usedHours,
  ),
)

const worstState = computed(() =>
  far117LookbackWorstState(state672.value, state365.value),
)

const dotClass = computed(() =>
  far117LookbackDotBgClass(worstState.value, props.isDarkMode),
)

const infoNote = computed(() => {
  let note = FAR117_LOOKBACK_INFO_NOTE
  if (props.lookbacks.consecutive672Hours.usedWholeDayApproximation) {
    note +=
      ' Some legs without OOOI out used whole calendar days in the 672-hour window.'
  }
  return note
})

const buttonAriaLabel = computed(() => {
  const phrase = far117LookbackStateAriaPhrase(worstState.value)
  const h672 = formatLine(
    '672h',
    props.lookbacks.consecutive672Hours.usedHours,
    props.lookbacks.consecutive672Hours.limitHours,
  )
  const d365 = formatLine(
    '365d',
    props.lookbacks.consecutive365CalendarDays.usedHours,
    props.lookbacks.consecutive365CalendarDays.limitHours,
  )
  return `FAR 117 flight-time lookbacks, ${phrase}. ${h672}. ${d365}. ${infoNote.value}`
})
</script>