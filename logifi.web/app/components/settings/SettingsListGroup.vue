<template>
  <div>
    <p v-if="title" :class="listGroupHeader">{{ title }}</p>
    <div :class="[listGroup, title ? 'mt-1' : '']">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsClasses } from './useSettingsClasses'

const props = defineProps<{
  title?: string
  isDarkMode: boolean
}>()

const { listGroup, listGroupHeader } = useSettingsClasses(computed(() => props.isDarkMode))
</script>
