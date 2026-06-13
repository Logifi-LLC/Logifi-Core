<template>
  <div class="space-y-4">
    <SettingsListGroup :is-dark-mode="isDarkMode">
      <div class="px-4 py-3">
        <p :class="isDarkMode ? 'text-sm text-gray-400' : 'text-sm text-gray-600'">
          Track electronic logbook compliance with AC 120-78B and 14 CFR Part 61.
        </p>
      </div>
      <div class="border-t px-2 py-2" :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'">
        <ComplianceChecklist :is-dark-mode="isDarkMode" />
      </div>
    </SettingsListGroup>
  </div>
</template>

<script setup lang="ts">
import SettingsListGroup from '../SettingsListGroup.vue'
import ComplianceChecklist from '~/components/ComplianceChecklist.vue'

defineProps<{
  isDarkMode: boolean
}>()
</script>
