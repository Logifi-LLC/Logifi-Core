<template>
  <div
    :class="[
      'mt-6 rounded-2xl border transition-colors duration-300 relative overflow-hidden p-3 space-y-3',
      isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-300 bg-gray-100 shadow-sm',
    ]"
  >
    <LogEntryCard
      v-for="entry in entries"
      :key="entry.id"
      :entry="entry"
      :is-dark-mode="isDarkMode"
      :visible-detail-fields="visibleDetailFields"
      :show-remarks-footer="showRemarksFooter"
      @click="$emit('select', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { LogbookColumnConfig, LogEntry } from '~/utils/logbookTypes'
import LogEntryCard from './LogEntryCard.vue'

defineProps<{
  entries: LogEntry[]
  isDarkMode: boolean
  visibleDetailFields: LogbookColumnConfig[]
  showRemarksFooter: boolean
}>()

defineEmits<{
  select: [entry: LogEntry]
}>()
</script>
