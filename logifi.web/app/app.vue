<template>
  <div>
    <Teleport to="body">
      <div
        v-if="toastMessage"
        role="status"
        class="fixed top-[calc(env(safe-area-inset-top,0px)+1rem)] left-1/2 z-[200] flex max-w-md w-[calc(100%-2rem)] -translate-x-1/2 items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 font-quicksand text-sm font-medium text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      >
        <Icon name="ri:checkbox-circle-fill" class="mt-0.5 flex-shrink-0 text-emerald-500" size="20" />
        <p class="flex-1 pt-0.5">{{ toastMessage }}</p>
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
import { useToast } from '~/composables/useToast'

// Keep `html.dark` / `html.light` in sync with stored app theme for `dark:` utilities site-wide.
useTheme()
const { toastMessage, dismissToast } = useToast()
</script>

<style>
/* Global styles can go here if needed */
/* Google font "Quicksand" */
</style>