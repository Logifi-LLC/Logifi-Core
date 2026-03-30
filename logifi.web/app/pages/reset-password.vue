<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 font-quicksand p-4">
    <div class="w-full max-w-md">
      <div
        class="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-gray-800 p-8"
      >
        <!-- Loading -->
        <div v-if="!pageReady" class="text-center space-y-4">
          <div class="flex justify-center">
            <Icon name="ri:loader-4-line" size="48" class="animate-spin text-blue-600" />
          </div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">Loading...</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">Preparing your password reset</p>
        </div>

        <!-- Invalid / expired -->
        <div v-else-if="!isPasswordRecoverySession" class="text-center space-y-4">
          <div class="flex justify-center">
            <Icon name="ri:error-warning-fill" size="48" class="text-amber-500" />
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Invalid or expired link</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Request a new password reset from the sign-in screen, or return home.
          </p>
          <NuxtLink
            to="/"
            class="inline-flex w-full justify-center px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10"
          >
            Return to Home
          </NuxtLink>
        </div>

        <!-- Form -->
        <div v-else class="space-y-6">
          <div class="text-center space-y-4">
            <img src="/images/logifi-logo.png" alt="Logifi" class="h-12 w-auto mx-auto" />
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Set a new password</h1>
            <p class="text-sm text-gray-500 dark:text-gray-400">Choose a strong password for your account.</p>
          </div>

          <form class="space-y-4" @submit.prevent="handleSubmit">
            <div>
              <label for="new-password" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                New password
              </label>
              <div class="relative">
                <Icon
                  name="ri:lock-password-line"
                  size="18"
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="new-password"
                  v-model="newPassword"
                  type="password"
                  autocomplete="new-password"
                  required
                  minlength="6"
                  class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div>
              <label for="confirm-password" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Confirm new password
              </label>
              <div class="relative">
                <Icon
                  name="ri:lock-password-line"
                  size="18"
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="confirm-password"
                  v-model="confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  required
                  minlength="6"
                  class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div
              v-if="formError"
              class="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm font-medium"
            >
              {{ formError }}
            </div>

            <button
              type="submit"
              :disabled="submitting || !isFormValid"
              class="w-full py-4 rounded-xl font-bold text-sm font-quicksand transition-all shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700"
            >
              <span v-if="submitting" class="inline-flex items-center justify-center gap-2">
                <Icon name="ri:loader-4-line" size="18" class="animate-spin" />
                Updating…
              </span>
              <span v-else>Update password</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'

const { isPasswordRecoverySession, completePasswordReset } = useAuth()
const { showToast } = useToast()

const pageReady = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const formError = ref<string | null>(null)
const submitting = ref(false)

const isFormValid = computed(() => {
  if (newPassword.value.length < 6 || confirmPassword.value.length < 6) return false
  return newPassword.value === confirmPassword.value
})

onMounted(async () => {
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
  await new Promise((r) => setTimeout(r, 0))
  pageReady.value = true
})

const handleSubmit = async () => {
  formError.value = null
  if (newPassword.value.length < 6) {
    formError.value = 'Password must be at least 6 characters.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    formError.value = 'Passwords do not match.'
    return
  }

  submitting.value = true
  try {
    const result = await completePasswordReset(newPassword.value)
    if (result.success) {
      showToast('Password updated successfully. You are now logged in.')
      await navigateTo('/dashboard')
    } else {
      formError.value = result.error ?? 'Could not update password.'
    }
  } finally {
    submitting.value = false
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
