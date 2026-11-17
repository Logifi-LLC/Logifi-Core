<script setup lang="ts">
import { computed } from 'vue'
import FlightDrawnSignatureImage from './FlightDrawnSignatureImage.vue'

const props = defineProps<{
  isSigned: boolean
  blockText: string
  inkUrl: string | null
  showInkUnavailable: boolean
  isDarkMode: boolean
}>()

const inkSrc = computed(() =>
  typeof props.inkUrl === 'string' ? props.inkUrl.trim() : ''
)
const showInkImage = computed(() => inkSrc.value.length > 0)
</script>

<template>
  <div
    v-if="isSigned"
    :class="[
      'space-y-2 pt-2 text-sm font-quicksand',
      isDarkMode ? 'text-green-200' : 'text-green-800',
    ]"
  >
    <p class="font-medium">{{ blockText }}</p>
    <FlightDrawnSignatureImage
      v-if="showInkImage"
      :key="inkSrc"
      :src="inkSrc"
      :is-dark-mode="isDarkMode"
    />
    <p
      v-else-if="showInkUnavailable"
      :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-500' : 'text-gray-500']"
    >
      Signature image unavailable
    </p>
  </div>
</template>