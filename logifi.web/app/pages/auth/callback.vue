<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 font-quicksand">
    <div class="w-full max-w-md p-8">
      <div class="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-gray-800 p-8 text-center">
        <!-- Loading State -->
        <div v-if="isProcessing" class="space-y-4">
          <div class="flex justify-center">
            <Icon name="ri:loader-4-line" size="48" class="animate-spin text-blue-600" />
          </div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ loadingTitle }}</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ loadingSubtitle }}</p>
        </div>

        <!-- Success State -->
        <div v-else-if="isSuccess" class="space-y-4">
          <div class="flex justify-center">
            <Icon name="ri:checkbox-circle-fill" size="48" class="text-green-500" />
          </div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ successTitle }}</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ successSubtitle }}</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="space-y-4">
          <div class="flex justify-center">
            <Icon name="ri:error-warning-fill" size="48" class="text-red-500" />
          </div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Sign in failed</h2>
          <p class="text-sm text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
          <div class="space-y-2">
            <NuxtLink
              to="/"
              class="block w-full px-4 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
            >
              Return to Home
            </NuxtLink>
            <button
              @click="retry"
              class="block w-full px-4 py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-[0.98]"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useAuth } from '~/composables/useAuth'

type CallbackKind = 'signup' | 'recovery' | 'signin'

const { initAuth, isAuthenticated, user, isPasswordRecoverySession } = useAuth()

const isProcessing = ref(true)
const isSuccess = ref(false)
const error = ref<string | null>(null)
const callbackKind = ref<CallbackKind>('signin')

function parseSupabaseAuthType(): string | null {
  if (typeof window === 'undefined') return null
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const fromHash = hashParams.get('type')
  if (fromHash) return fromHash
  const searchParams = new URLSearchParams(window.location.search)
  return searchParams.get('type')
}

function resolveCallbackKind(type: string | null): CallbackKind {
  if (type === 'signup') return 'signup'
  if (type === 'recovery') return 'recovery'
  return 'signin'
}

const loadingTitle = computed(() => {
  switch (callbackKind.value) {
    case 'signup':
      return 'Verifying your email...'
    case 'recovery':
      return 'Completing password reset...'
    default:
      return 'Completing sign in...'
  }
})

const loadingSubtitle = computed(() => {
  switch (callbackKind.value) {
    case 'signup':
      return 'Hang on while we confirm your account.'
    case 'recovery':
      return 'Please wait while we sign you in.'
    default:
      return 'Please wait while we verify your account'
  }
})

const successTitle = computed(() => {
  switch (callbackKind.value) {
    case 'signup':
      return 'Verification successful!'
    case 'recovery':
      return 'Password reset complete'
    default:
      return 'Sign in successful!'
  }
})

const successSubtitle = computed(() => {
  switch (callbackKind.value) {
    case 'signup':
      return "You're signed in. Redirecting to your dashboard..."
    case 'recovery':
      return 'Redirecting to your dashboard...'
    default:
      return 'Redirecting to your dashboard...'
  }
})

const REDIRECT_MS = 2000

const processCallback = async () => {
  try {
    isProcessing.value = true
    error.value = null

    const type = parseSupabaseAuthType()
    callbackKind.value = resolveCallbackKind(type)
    const isRecovery = type === 'recovery'

    await initAuth()
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    if (isPasswordRecoverySession.value) {
      await navigateTo('/reset-password')
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 500))

    if (isAuthenticated.value && user.value) {
      isProcessing.value = false
      isSuccess.value = true

      setTimeout(() => {
        navigateTo('/dashboard')
      }, REDIRECT_MS)
    } else {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        const errorDescription = urlParams.get('error_description')
        const errorCode = urlParams.get('error')

        if (errorDescription) {
          error.value = decodeURIComponent(errorDescription)
        } else if (errorCode) {
          error.value = `Authentication error: ${errorCode}`
        } else if (isRecovery) {
          error.value = 'Failed to complete password reset. The link may have expired or already been used.'
        } else {
          error.value = 'Failed to complete sign in. Please try again.'
        }
      } else {
        error.value = 'Failed to complete authentication. Please try again.'
      }

      isProcessing.value = false
    }
  } catch (err) {
    console.error('OAuth callback error:', err)
    error.value = err instanceof Error ? err.message : 'An unexpected error occurred'
    isProcessing.value = false
  }
}

const retry = () => {
  error.value = null
  isProcessing.value = true
  isSuccess.value = false
  processCallback()
}

onMounted(() => {
  processCallback()
})
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
