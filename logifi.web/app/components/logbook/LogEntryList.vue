<template>
  <div
    :class="[
      'mt-6 space-y-3 rounded-2xl border p-3 transition-colors duration-300',
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
      :is-signed="isEntrySigned?.(entry.id) ?? false"
      :is-pending="!!entry.signaturePending && !(isEntrySigned?.(entry.id) ?? false)"
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
  isEntrySigned?: (entryId: string) => boolean
}>()

defineEmits<{
  select: [entry: LogEntry]
}>()
</script>
