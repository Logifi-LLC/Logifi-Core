<template>
  <div
    class="inline-flex rounded-lg border p-0.5 text-sm font-quicksand"
    :class="isDarkMode ? 'border-gray-600 bg-gray-900' : 'border-gray-200 bg-gray-100'"
    role="group"
    :aria-label="ariaLabel"
  >
    <button
      v-for="(opt, index) in options"
      :key="opt.value"
      type="button"
      class="px-4 py-1.5 rounded-md transition-colors"
      :class="[
        modelValue === opt.value
          ? 'bg-blue-600 text-white shadow-sm'
          : isDarkMode
            ? 'text-gray-300 hover:text-white'
            : 'text-gray-600 hover:text-gray-900',
        index > 0 ? '' : '',
      ]"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  options: { value: string; label: string }[]
  isDarkMode: boolean
  ariaLabel?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
