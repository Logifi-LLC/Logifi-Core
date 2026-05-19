<template>
  <div class="space-y-1.5">
    <label v-if="label" :for="inputId" :class="labelClass">
      {{ label }}
      <span v-if="hint" class="font-normal text-gray-500 dark:text-gray-400"> {{ hint }}</span>
    </label>
    <slot :input-class="inputClass" :input-id="inputId" />
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import { useSettingsClasses } from './useSettingsClasses'

const props = defineProps<{
  label?: string
  hint?: string
  isDarkMode: boolean
}>()

const uid = useId()
const inputId = computed(() => `settings-field-${uid}`)

const { label: labelClass, input: inputClass } = useSettingsClasses(computed(() => props.isDarkMode))
</script>
