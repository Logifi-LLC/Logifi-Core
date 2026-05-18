<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
    <div class="min-w-0 sm:max-w-[40%]">
      <p v-if="label" :class="labelClass">{{ label }}</p>
      <p v-if="description" :class="descClass" class="mt-0.5">{{ description }}</p>
    </div>
    <div class="shrink-0">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsClasses } from './useSettingsClasses'

const props = defineProps<{
  label?: string
  description?: string
  isDarkMode: boolean
}>()

const { label: labelClass, helper: descClass } = useSettingsClasses(computed(() => props.isDarkMode))
</script>
