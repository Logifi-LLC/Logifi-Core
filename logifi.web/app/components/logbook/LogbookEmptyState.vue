<template>
  <div
    class="flex flex-col gap-4 text-left"
    data-testid="logbook-empty-state"
  >
    <div>
      <h3
        class="text-base font-semibold font-quicksand"
        :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'"
      >
        {{ heading }}
      </h3>
      <p
        class="mt-1 text-sm font-quicksand"
        :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
      >
        Pick how you want to start your logbook.
      </p>
    </div>
    <div class="flex flex-col gap-2">
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
      <span>Import a logbook</span>
    </button>
    <button
      type="button"
      class="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium font-quicksand transition-colors"
      :class="rowClass"
      @click="$emit('scan-digifi')"
    >
      <Icon name="ri:scan-line" size="18" class="shrink-0" />
      <span>Scan paper with Digifi</span>
    </button>
    </div>
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

const heading = computed(() =>
  props.isSimulator ? 'Start your simulator log' : 'Start your logbook'
)

const addLabel = computed(() => (props.isSimulator ? 'Add a simulator entry' : 'Add a flight'))

const rowClass = computed(() =>
  props.isDarkMode
    ? 'border-white/10 bg-gray-800/60 text-gray-200 hover:bg-gray-800'
    : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
)
</script>
