<template>
  <p
    v-if="message"
    :id="id"
    class="mt-1 text-sm font-medium font-quicksand"
    :class="isDarkMode ? 'text-red-300' : 'text-red-700'"
    role="alert"
  >
    {{ message }}
  </p>
</template>

<script setup lang="ts">
defineProps<{
  id: string
  message: string | null | undefined
  isDarkMode: boolean
}>()
</script>
