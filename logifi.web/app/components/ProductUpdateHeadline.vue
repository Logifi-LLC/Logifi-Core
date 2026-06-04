<template>
  <div :class="compact ? 'mb-2' : 'mb-3'">
    <component
      :is="headingTag"
      :class="[
        'font-bold font-quicksand tracking-tight',
        compact ? 'text-xl' : 'text-2xl sm:text-3xl',
        isDarkMode ? 'text-white' : 'text-gray-900',
      ]"
    >
      <span
        class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400"
      >
        {{ title }}
      </span>
    </component>
    <p
      v-if="tagline"
      :class="[
        'font-semibold uppercase tracking-wider',
        compact ? 'mt-1 text-xs' : 'mt-1.5 text-sm',
        isDarkMode ? 'text-blue-400' : 'text-blue-600',
      ]"
    >
      {{ tagline }}
    </p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    tagline?: string
    isDarkMode?: boolean
    compact?: boolean
    headingTag?: 'h2' | 'h3' | 'p'
  }>(),
  {
    isDarkMode: false,
    compact: false,
    headingTag: 'h3',
  }
)
</script>
