<template>
  <div
    class="absolute inset-x-0 flex justify-center pointer-events-none min-w-0 px-16 sm:px-24"
    data-testid="header-utc-clock-bar"
  >
    <div
      class="flex max-w-full min-w-0 items-center justify-center gap-1.5 sm:gap-2 pointer-events-auto"
    >
      <Far117LookbackPanel
        v-if="shouldShowFar117HeaderLookbacks"
        side="672"
        :lookbacks="lookbacks!"
        :is-dark-mode="isDarkMode"
        compact
        extra-class="hidden md:block max-w-[5.5rem] sm:max-w-[7rem] truncate"
      />
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
      <Far117LookbackPanel
        v-if="shouldShowFar117HeaderLookbacks"
        side="365"
        :lookbacks="lookbacks!"
        :is-dark-mode="isDarkMode"
        compact
        extra-class="hidden md:block max-w-[6rem] sm:max-w-[7.5rem] truncate text-right"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import Far117LookbackPanel from '~/components/logbook/Far117LookbackPanel.vue'
import { useFar117HeaderLookbacks } from '~/composables/useFar117HeaderLookbacks'

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

onMounted(() => {
  loadFar117LookbackPreference()
})
</script>