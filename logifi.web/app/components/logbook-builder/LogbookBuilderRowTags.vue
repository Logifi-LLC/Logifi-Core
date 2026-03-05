<script setup lang="ts">
import { ref } from 'vue'
import { useTheme } from '~/composables/useTheme'

const props = defineProps<{ modelValue: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const { isDark } = useTheme()

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
        'rounded border px-2 py-0.5 text-xs font-medium transition-colors',
        (modelValue ?? []).includes(tag)
          ? (isDark ? 'border-blue-800 bg-blue-900/50 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-700')
          : (isDark ? 'border-white/10 bg-transparent text-gray-300 hover:bg-white/10 hover:shadow-sm hover:shadow-black/20' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50')
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
        :class="[
          'w-20 rounded border px-1.5 py-0.5 text-xs shadow-sm transition-colors',
          isDark ? 'border-white/10 bg-black/20 text-white shadow-inner' : 'border-gray-300 bg-white text-gray-900'
        ]"
        @keydown.enter.prevent="addCustomTag()"
        @blur="addCustomTag(); showCustomInput = false"
      />
    </template>
    <button
      v-else
      type="button"
      :class="[
        'rounded border border-dashed px-1.5 py-0.5 text-xs transition-colors',
        isDark 
          ? 'border-white/10 bg-transparent text-gray-400 hover:border-white/20 hover:bg-white/10 hover:shadow-sm hover:shadow-black/20' 
          : 'border-gray-300 bg-white text-gray-500 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-700'
      ]"
      aria-label="Add tag"
      @click="showCustomInput = true"
    >
      + Tag
    </button>
  </div>
</template>
