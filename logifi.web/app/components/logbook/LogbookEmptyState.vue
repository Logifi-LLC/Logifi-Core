<template>
  <div
    class="flex flex-col gap-2 text-left"
    data-testid="logbook-empty-state"
  >
    <button
      type="button"
      class="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium font-quicksand transition-colors"
      :class="rowClass"
      @click="$emit('add-entry')"
    >
      <Icon name="ri:add-line" size="18" class="shrink-0" />
      <span>{{ addLabel }}</span>
    </button>
    <button
      type="button"
      class="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium font-quicksand transition-colors"
      :class="rowClass"
      @click="$emit('import-csv')"
    >
      <Icon name="ri:upload-cloud-2-line" size="18" class="shrink-0" />
      <span>Import CSV</span>
    </button>
    <button
      type="button"
      class="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium font-quicksand transition-colors"
      :class="rowClass"
      @click="$emit('scan-digifi')"
    >
      <Icon name="ri:scan-line" size="18" class="shrink-0" />
      <span>Scan with Digifi</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  isDarkMode: boolean
  /** Active logbook: flight vs simulator */
  isSimulator: boolean
}>()

defineEmits<{
  'add-entry': []
  'import-csv': []
  'scan-digifi': []
}>()

const addLabel = computed(() => (props.isSimulator ? 'Add a sim' : 'Add a flight'))

const rowClass = computed(() =>
  props.isDarkMode
    ? 'border-white/10 bg-gray-800/60 text-gray-200 hover:bg-gray-800'
    : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
)
</script>
