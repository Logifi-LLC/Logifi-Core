<template>
  <MarketingSecondaryPageShell>
    <div class="relative min-h-screen overflow-x-hidden">
      <MarketingPaperPlanes />
      <main
        class="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center"
      >
      <NuxtLink to="/" class="mb-10 inline-flex" @click.prevent="goHome">
        <img
          src="/images/logifi-logo.png"
          alt="Logifi"
          class="h-32 w-auto brightness-0 invert"
        />
      </NuxtLink>

      <p class="text-sm font-bold uppercase tracking-wide text-blue-400 mb-3">
        {{ statusCode }}
      </p>

      <h1 class="text-3xl sm:text-4xl font-bold text-gray-100 mb-4 font-quicksand">
        {{ heading }}
      </h1>

      <p class="max-w-md text-lg text-gray-400 mb-10 leading-relaxed">
        {{ message }}
      </p>

      <button
        type="button"
        class="btn-cta-primary px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-lg hover:bg-blue-700 transition-all border border-blue-500/50 shadow-lg shadow-blue-900/50 hover:shadow-xl hover:shadow-blue-900/60 active:scale-[0.98]"
        @click="goHome"
      >
        <span class="relative z-10">Back to home</span>
      </button>
    </main>
    </div>
  </MarketingSecondaryPageShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import MarketingPaperPlanes from '~/components/MarketingPaperPlanes.vue'
import MarketingSecondaryPageShell from '~/components/MarketingSecondaryPageShell.vue'

const error = useError()

const statusCode = computed(() => error.value?.statusCode ?? 500)
const isNotFound = computed(() => statusCode.value === 404)

const heading = computed(() =>
  isNotFound.value ? 'Page not found' : 'Something went wrong'
)

const message = computed(() => {
  if (isNotFound.value) {
    return 'That URL is not on the map. Head back to the home page.'
  }
  const detail = error.value?.statusMessage || error.value?.message
  if (detail && detail !== 'Page Not Found') {
    return detail
  }
  return 'An unexpected error occurred. Try again from the home page.'
})

const pageTitle = computed(() =>
  isNotFound.value ? 'Page not found | Logifi' : 'Error | Logifi'
)

useHead({
  title: pageTitle,
  meta: [
    {
      name: 'description',
      content: isNotFound.value
        ? 'The page you requested was not found on Logifi.'
        : 'An error occurred while loading this page on Logifi.',
    },
  ],
})

const { theme, applyDocumentTheme } = useTheme()

if (import.meta.client) {
  applyDocumentTheme('light')
  onBeforeUnmount(() => {
    applyDocumentTheme(theme.value)
  })
}

function goHome() {
  clearError({ redirect: '/' })
}
</script>
