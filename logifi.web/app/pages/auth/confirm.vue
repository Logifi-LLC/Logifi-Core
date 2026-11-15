<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 font-quicksand p-4">
    <div class="w-full max-w-md">
      <div
        class="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-gray-800 p-8"
      >
        <div v-if="status === 'working'" class="text-center space-y-4">
          <div class="flex justify-center">
            <Icon name="ri:loader-4-line" size="48" class="animate-spin text-blue-600" />
          </div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">Confirming reset link</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">Hang on.</p>
        </div>

        <div v-else class="space-y-6">
          <div class="text-center space-y-4">
            <div class="flex justify-center">
              <Icon name="ri:error-warning-fill" size="48" class="text-amber-500" />
            </div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ errorTitle }}</h1>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ errorMessage }}</p>
          </div>

          <form class="space-y-4" @submit.prevent="handleResend">
            <div>
              <label for="confirm-reset-email" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                id="confirm-reset-email"
                ref="emailInput"
                v-model="email"
                type="email"
                autocomplete="email"
                required
                class="min-h-[44px] w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-base text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div
              v-if="formError"
              class="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm font-medium"
            >
              {{ formError }}
            </div>
            <div
              v-else-if="formSuccess"
              class="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm font-medium"
            >
              {{ formSuccess }}
            </div>

            <button
              type="submit"
              :disabled="sendingReset"
              class="min-h-[44px] w-full py-4 rounded-xl font-bold text-sm font-quicksand transition-all shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700"
            >
              <span v-if="sendingReset" class="inline-flex items-center justify-center gap-2">
                <Icon name="ri:loader-4-line" size="18" class="animate-spin" />
                Sending…
              </span>
              <span v-else>Send reset link</span>
            </button>
          </form>

          <NuxtLink
            to="/login"
            referrerpolicy="no-referrer"
            class="inline-flex min-h-[44px] w-full items-center justify-center px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            Sign in
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { supabase } from '~/lib/supabase'
import { confirmAuthOtp, type ConfirmAuthOtpFailureReason } from '~/utils/confirmAuthOtp'
import { withTimeout } from '~/utils/promiseTimeout'

useSeoMeta({
  title: 'Confirm reset — Logifi',
  description: 'Confirm a Logifi password reset link.',
})

useHead({
  meta: [{ name: 'referrer', content: 'no-referrer' }],
})

const { initAuth, resetPassword } = useAuth()
const route = useRoute()
const pendingTokenHash = route.query.token_hash
const pendingType = route.query.type
const pendingNext = route.query.next

const status = ref<'working' | 'error'>('working')
const errorTitle = ref('Reset link expired')
const errorMessage = ref('This reset link expired or was already used. Request a new one.')
const email = ref('')
const emailInput = ref<HTMLInputElement | null>(null)
const formError = ref<string | null>(null)
const formSuccess = ref<string | null>(null)
const sendingReset = ref(false)

function stripTokenFromLocation() {
  if (typeof window === 'undefined') return
  if (!window.location.search && !window.location.hash) return
  window.history.replaceState(window.history.state, '', '/auth/confirm')
}

if (import.meta.client) stripTokenFromLocation()

function errorTitleForReason(reason: ConfirmAuthOtpFailureReason): string {
  if (reason === 'bad_type') return "Can't use this link"
  if (reason === 'missing_token') return 'Reset link incomplete'
  return 'Reset link expired'
}

function resendErrorMessage(error: string | undefined): string {
  const raw = (error ?? '').toLowerCase()
  if (!raw || raw.includes('fetch') || raw.includes('network') || raw.includes('timeout')) {
    return 'Could not send a reset link. Try again.'
  }
  return error ?? 'Could not send a reset link.'
}

onMounted(async () => {
  try {
    await initAuth()
    const result = await confirmAuthOtp({
      tokenHash: pendingTokenHash,
      type: pendingType,
      next: pendingNext,
      verifyOtp: (args) => withTimeout(supabase.auth.verifyOtp(args), 8000, 'Auth confirm'),
    })

    if (result.ok) {
      await navigateTo(result.nextPath)
      return
    }

    errorTitle.value = errorTitleForReason(result.reason)
    errorMessage.value = result.message
  } catch {
    errorTitle.value = 'Reset link expired'
    errorMessage.value = 'Could not verify this link. Request a new reset link.'
  }

  status.value = 'error'
  await nextTick()
  emailInput.value?.focus()
})

const handleResend = async () => {
  formError.value = null
  formSuccess.value = null
  const trimmed = email.value.trim()
  if (!trimmed) {
    formError.value = 'Enter the email for this account.'
    emailInput.value?.focus()
    return
  }

  sendingReset.value = true
  try {
    const result = await resetPassword(trimmed)
    if (result.success) {
      formSuccess.value = 'Reset link sent. Check your email.'
    } else {
      formError.value = resendErrorMessage(result.error)
    }
  } finally {
    sendingReset.value = false
  }
}
</script>

<style scoped>
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
