<script setup lang="ts">
import { ref } from 'vue'
const props = defineProps<{ modelValue: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const presetTags = ['Checkride', 'Flight Review', 'IPC'] as const
const showCustomInput = ref(false)
const customTagInput = ref('')

function toggleTag(tag: string) {
  const current = props.modelValue ?? []
  const next = current.includes(tag)
    ? current.filter((t) => t !== tag)
    : [...current, tag]
  emit('update:modelValue', next)
}

function addCustomTag() {
  const t = customTagInput.value.trim()
  if (!t) return
  const current = props.modelValue ?? []
  if (current.includes(t)) return
  emit('update:modelValue', [...current, t])
  customTagInput.value = ''
  showCustomInput.value = false
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-1">
    <button
      v-for="tag in presetTags"
      :key="tag"
      type="button"
      :class="[
        'rounded px-2 py-0.5 text-xs font-medium transition-colors',
        (modelValue ?? []).includes(tag)
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
      ]"
      @click="toggleTag(tag)"
    >
      {{ tag }}
    </button>
    <template v-if="showCustomInput">
      <input
        v-model="customTagInput"
        type="text"
        placeholder="Custom"
        class="w-20 rounded border border-gray-300 px-1.5 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        @keydown.enter.prevent="addCustomTag()"
        @blur="addCustomTag(); showCustomInput = false"
      />
    </template>
    <button
      v-else
      type="button"
      class="rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
      aria-label="Add tag"
      @click="showCustomInput = true"
    >
      + Tag
    </button>
  </div>
</template>
