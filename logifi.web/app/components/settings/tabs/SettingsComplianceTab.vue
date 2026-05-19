<template>
  <div class="mx-auto max-w-4xl space-y-4">
    <p :class="isDarkMode ? 'text-sm text-gray-400' : 'text-sm text-gray-600'">
      Track electronic logbook compliance with AC 120-78B and 14 CFR Part 61.
    </p>
    <ComplianceChecklist :is-dark-mode="isDarkMode" />
  </div>
</template>

<script setup lang="ts">
import ComplianceChecklist from '~/components/ComplianceChecklist.vue'

defineProps<{
  isDarkMode: boolean
}>()
</script>
