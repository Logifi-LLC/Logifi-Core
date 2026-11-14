<template>
  <button
    v-if="mode === 'quick'"
    type="button"
    :class="[
      'min-h-[44px] w-full rounded-lg border px-3 text-sm font-quicksand',
      isDarkMode
        ? 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700'
        : 'border-gray-300 bg-gray-50 text-gray-800 hover:bg-gray-100',
    ]"
    :aria-expanded="open ? 'true' : 'false'"
    @click="$emit('toggle')"
  >
    {{ open ? 'Fewer fields' : 'More fields' }}
  </button>
</template>

<script setup lang="ts">
import type { EntryFormMode } from '~/utils/entryFormMode'

defineProps<{
  mode: EntryFormMode
  open: boolean
  isDarkMode: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>
