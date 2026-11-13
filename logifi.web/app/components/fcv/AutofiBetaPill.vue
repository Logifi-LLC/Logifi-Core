<script setup lang="ts">
import { computed } from 'vue'
import { AUTOFI_BETA_PILL } from '~/utils/autofiBeta'

const props = withDefaults(
  defineProps<{
    isDarkMode?: boolean
    /** `marketing` stays light on landing/integrations even if `html.dark` is set. */
    tone?: 'app' | 'marketing'
    /** Override pill text (e.g. marketing copy without airline codes). */
    label?: string
  }>(),
  {
    isDarkMode: false,
    tone: 'app',
    label: undefined,
  },
)

const pillText = computed(() => props.label ?? AUTOFI_BETA_PILL)
</script>

<template>
  <span
    class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold tracking-wide"
    :class="
      tone === 'marketing'
        ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-50 dark:border-amber-200 dark:text-amber-800'
        : isDarkMode
          ? 'bg-amber-500/15 border-amber-500/35 text-amber-200'
          : 'bg-amber-50 border-amber-200 text-amber-800'
    "
  >
    {{ pillText }}
  </span>
</template>
