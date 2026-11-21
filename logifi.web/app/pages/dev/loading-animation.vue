<template>
  <div class="min-h-dvh bg-gray-950 font-quicksand text-gray-200">
    <LoadingAnimation
      v-if="mode === 'fullscreen'"
      :variant="variant"
      fullscreen
      label="Loading animation preview"
    />
    <main class="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <h1 class="text-lg font-semibold text-white">Loading animation demo</h1>
      <p class="text-sm text-gray-400">
        Dev-only preview for screen recordings. Not linked from product nav.
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="v in variants"
          :key="v"
          type="button"
          class="rounded-lg border border-white/10 px-3 py-1.5 text-sm capitalize transition-colors"
          :class="variant === v ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'"
          @click="setVariant(v)"
        >
          {{ v }}
        </button>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg border border-white/10 px-3 py-1.5 text-sm transition-colors"
          :class="mode === 'fullscreen' ? 'bg-white/10 text-white' : 'text-gray-400'"
          @click="mode = 'fullscreen'"
        >
          Fullscreen
        </button>
        <button
          type="button"
          class="rounded-lg border border-white/10 px-3 py-1.5 text-sm transition-colors"
          :class="mode === 'inline' ? 'bg-white/10 text-white' : 'text-gray-400'"
          @click="mode = 'inline'"
        >
          Inline
        </button>
      </div>
      <div
        v-if="mode === 'inline'"
        class="relative flex min-h-48 items-center justify-center rounded-2xl border border-white/10 bg-gray-900"
      >
        <LoadingAnimation :variant="variant" :fullscreen="false" size="lg" label="Inline preview" />
      </div>
      <p class="text-xs text-gray-500">
        URL: <code class="text-gray-400">/dev/loading-animation?variant=propeller</code> or
        <code class="text-gray-400">variant=wordmark</code>
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import LoadingAnimation, { type LoadingAnimationVariant } from '~/components/LoadingAnimation.vue'

definePageMeta({
  layout: false,
})

const route = useRoute()
const router = useRouter()

const variants: LoadingAnimationVariant[] = ['propeller', 'wordmark']

const variant = computed<LoadingAnimationVariant>(() =>
  route.query.variant === 'wordmark' ? 'wordmark' : 'propeller'
)

const mode = ref<'fullscreen' | 'inline'>(
  route.query.mode === 'inline' ? 'inline' : 'fullscreen'
)

function setVariant(v: LoadingAnimationVariant) {
  void router.replace({ query: { ...route.query, variant: v } })
}

watch(mode, (m) => {
  void router.replace({ query: { ...route.query, mode: m } })
})
</script>