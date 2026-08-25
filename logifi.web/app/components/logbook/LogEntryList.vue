<template>
  <div
    :class="[
      'mt-6 rounded-2xl border transition-colors duration-300 relative overflow-hidden p-3',
      isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-300 bg-gray-100 shadow-sm',
    ]"
  >
    <div class="relative" :style="{ height: `${totalSize}px` }">
      <div
        v-for="item in virtualItems"
        :key="entries[item.index]?.id ?? item.index"
        class="absolute left-0 right-0"
        :style="{ transform: `translateY(${item.start}px)` }"
      >
        <LogEntryCard
          v-if="entries[item.index]"
          :entry="entries[item.index]"
          :is-dark-mode="isDarkMode"
          :visible-detail-fields="visibleDetailFields"
          :show-remarks-footer="showRemarksFooter"
          :is-signed="isEntrySigned?.(entries[item.index].id) ?? false"
          :is-pending="!!entries[item.index].signaturePending && !(isEntrySigned?.(entries[item.index].id) ?? false)"
          @click="$emit('select', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import type { LogbookColumnConfig, LogEntry } from '~/utils/logbookTypes'
import { LOG_LIST_CARD_ESTIMATE_PX } from '~/utils/logListVirtual'
import { useLogListVirtualizer } from '~/composables/useLogListVirtualizer'
import LogEntryCard from './LogEntryCard.vue'

const props = defineProps<{
  entries: LogEntry[]
  isDarkMode: boolean
  visibleDetailFields: LogbookColumnConfig[]
  showRemarksFooter: boolean
  isEntrySigned?: (entryId: string) => boolean
  scrollParent?: HTMLElement | null
}>()

defineEmits<{
  select: [entry: LogEntry]
}>()

const isIosList = computed(() => true)
const entryCount = computed(() => props.entries.length)
const scrollParentRef = toRef(() => props.scrollParent ?? null)

const { virtualItems, totalSize, scrollToIndex } = useLogListVirtualizer({
  count: entryCount,
  isIos: isIosList,
  scrollParent: scrollParentRef,
  estimateSize: LOG_LIST_CARD_ESTIMATE_PX,
})

defineExpose({
  scrollToIndex,
})
</script>
