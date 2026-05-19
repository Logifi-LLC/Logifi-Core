<template>
  <div class="border-b mb-6" :class="isDarkMode ? 'border-gray-700' : 'border-gray-200'" role="tablist">
    <nav class="-mb-px flex gap-6">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :id="tab.id"
        :aria-selected="modelValue === tab.value"
        :aria-controls="tab.panelId"
        class="pb-3 text-sm font-medium font-quicksand border-b-2 transition-colors"
        :class="
          modelValue === tab.value
            ? isDarkMode
              ? 'border-blue-500 text-white'
              : 'border-blue-600 text-blue-700'
            : isDarkMode
              ? 'border-transparent text-gray-400 hover:text-gray-200'
              : 'border-transparent text-gray-500 hover:text-gray-800'
        "
        @click="$emit('update:modelValue', tab.value)"
      >
        {{ tab.label }}
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  tabs: { value: string; label: string; id: string; panelId: string }[]
  isDarkMode: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
