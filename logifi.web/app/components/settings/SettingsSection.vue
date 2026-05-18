<template>
  <section :class="sectionClass">
    <div v-if="title || description" class="mb-4">
      <h4 v-if="title" :class="titleClass">{{ title }}</h4>
      <p v-if="description" :class="descClass" class="mt-1">{{ description }}</p>
    </div>
    <slot />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsClasses } from './useSettingsClasses'

const props = defineProps<{
  title?: string
  description?: string
  isDarkMode: boolean
  bordered?: boolean
}>()

const { section, sectionTitle, helper } = useSettingsClasses(computed(() => props.isDarkMode))

const sectionClass = computed(() =>
  props.bordered === false ? 'space-y-4' : section.value
)
const titleClass = sectionTitle
const descClass = helper
</script>
