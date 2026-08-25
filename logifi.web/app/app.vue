<template>
  <div>
    <Teleport to="body">
      <div
        v-if="toastMessage"
        :role="toastType === 'error' ? 'alert' : 'status'"
        class="fixed top-[calc(env(safe-area-inset-top,0px)+1rem)] left-1/2 z-[200] flex max-w-md w-[calc(100%-2rem)] -translate-x-1/2 items-start gap-3 rounded-xl border bg-white px-4 py-3 font-quicksand text-sm font-medium text-gray-900 shadow-lg dark:bg-gray-900 dark:text-white"
        :class="toastSurfaceClass"
      >
        <Icon :name="toastIcon" class="mt-0.5 flex-shrink-0" :class="toastIconClass" size="20" />
        <p class="flex-1 whitespace-pre-line pt-0.5">{{ toastMessage }}</p>
        <button
          type="button"
          class="flex-shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="Dismiss"
          @click="dismissToast"
        >
          <Icon name="ri:close-line" size="18" />
        </button>
      </div>
    </Teleport>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useToast } from '~/composables/useToast'

// Keep `html.dark` / `html.light` in sync with stored app theme for `dark:` utilities site-wide.
useTheme()
const { toastMessage, toastType, dismissToast } = useToast()

const toastIcon = computed(() => {
  if (toastType.value === 'success') return 'ri:checkbox-circle-fill'
  if (toastType.value === 'error') return 'ri:error-warning-fill'
  return 'ri:information-fill'
})

const toastIconClass = computed(() => {
  if (toastType.value === 'success') return 'text-emerald-500'
  if (toastType.value === 'error') return 'text-red-500'
  return 'text-blue-500'
})

const toastSurfaceClass = computed(() => {
  if (toastType.value === 'success') return 'border-emerald-200 dark:border-emerald-800'
  if (toastType.value === 'error') return 'border-red-200 dark:border-red-800'
  return 'border-blue-200 dark:border-blue-800'
})
</script>
