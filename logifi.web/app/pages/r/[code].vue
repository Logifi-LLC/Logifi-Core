<template>
  <div class="flex min-h-screen items-center justify-center bg-[#0a0e1a] px-6 font-quicksand text-gray-100">
    <div class="w-full max-w-sm text-center">
      <template v-if="code">
        <p class="text-sm text-gray-400">Your friend's code is</p>
        <p class="mt-2 font-mono text-3xl font-semibold tracking-widest">{{ code }}</p>
        <button
          type="button"
          class="mt-6 w-full rounded-xl border border-gray-700 bg-gray-800 py-3 text-sm font-semibold"
          @click="copyCode"
        >
          {{ copied ? 'Copied' : 'Copy code' }}
        </button>
        <a
          :href="APP_STORE_URL"
          class="mt-3 flex w-full items-center justify-center rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white"
        >
          Get the app
        </a>
        <NuxtLink
          :to="{ path: '/', query: { ref: code, web: '1' } }"
          class="mt-6 inline-block text-sm text-gray-400"
        >
          or sign up on the web
        </NuxtLink>
      </template>
      <p v-else class="text-sm text-gray-400">That code is not valid</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { APP_STORE_URL } from '../../../shared/publicSeo'
import { normalizeReferralCode } from '../../../shared/referrals'
import { storeReferralCode } from '~/utils/referralCapture'

const route = useRoute()
const copied = ref(false)

const code = computed(() => {
  const raw = route.params.code
  const value = Array.isArray(raw) ? raw[0] : raw
  return normalizeReferralCode(typeof value === 'string' ? value : null)
})

watch(
  code,
  (value) => {
    if (value) storeReferralCode(value)
  },
  { immediate: true }
)

async function copyCode() {
  if (!code.value) return
  try {
    await navigator.clipboard.writeText(code.value)
    copied.value = true
  } catch {
    copied.value = false
  }
}
</script>
