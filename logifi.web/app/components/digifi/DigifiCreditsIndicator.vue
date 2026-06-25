<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useDigifiCredits } from '~/composables/useDigifiCredits'
import { useTheme } from '~/composables/useTheme'

const props = withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false,
})

defineEmits<{
  openCheckout: []
}>()

const { displayCredits, loading, showWelcomeCreditsHint, fetchTransactions } = useDigifiCredits()
const { isDark: isDarkMode } = useTheme()

onMounted(() => {
  void fetchTransactions()
})

const containerClass = computed(() =>
  props.compact
    ? 'flex flex-wrap items-center justify-between gap-3'
    : 'flex flex-col sm:flex-row sm:items-center gap-2'
)

const labelClass = computed(() =>
  props.compact
    ? 'text-sm font-medium font-quicksand'
    : 'text-xs sm:text-sm font-medium font-quicksand'
)
</script>

<template>
  <div class="space-y-1">
    <div
      :class="containerClass"
      data-testid="digifi-credits-indicator"
    >
      <span
        :class="[
          labelClass,
          isDarkMode ? 'text-gray-100' : 'text-gray-700',
        ]"
        aria-live="polite"
      >
        <Icon
          name="ri:coins-line"
          size="16"
          :class="['mr-1.5 align-[-2px]', isDarkMode ? 'text-blue-300' : 'text-blue-600']"
          aria-hidden="true"
        />
        Available Credits:
        <span :class="['font-semibold', isDarkMode ? 'text-white' : 'text-gray-900']">{{ loading ? '…' : displayCredits }}</span>
        <span class="font-normal opacity-80">(1 per spread)</span>
      </span>
      <button
        type="button"
        class="text-xs sm:text-sm font-semibold font-quicksand px-4 py-2 rounded-xl border transition-all duration-150 whitespace-nowrap shadow-sm"
        :class="[
          isDarkMode
            ? 'border-blue-400/60 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 hover:border-blue-300/80'
            : 'border-blue-300 text-blue-700 hover:bg-blue-50',
        ]"
        @click="$emit('openCheckout')"
      >
        + Add Credits
      </button>
    </div>
    <p
      v-if="showWelcomeCreditsHint"
      class="text-xs font-quicksand"
      :class="isDarkMode ? 'text-blue-200/80' : 'text-blue-700/80'"
    >
      Use your welcome spreads to build your catalog. Re-scans of the same spread are free.
    </p>
  </div>
</template>
