<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useEndorsements } from '~/composables/useEndorsements'

const props = defineProps<{
  isDarkMode: boolean
}>()

const { pendingSignatureCount, fetchMyEndorsements, fetchInstructorEndorsements } = useEndorsements()

const badgeText = computed(() => {
  const n = pendingSignatureCount.value
  if (n <= 0) return ''
  return n > 9 ? '9+' : String(n)
})

onMounted(() => {
  void Promise.all([fetchMyEndorsements(), fetchInstructorEndorsements()])
})
</script>

<template>
  <NuxtLink
    to="/endorsements?from=dashboard"
    class="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 transition-colors"
    :class="
      isDarkMode
        ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
        : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
    "
    aria-label="Endorsements"
  >
    <Icon name="ri:file-list-3-line" :size="22" />
    <span
      v-if="badgeText"
      class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white"
    >
      {{ badgeText }}
    </span>
  </NuxtLink>
</template>
