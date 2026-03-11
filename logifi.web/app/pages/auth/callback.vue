<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 font-quicksand">
    <div class="w-full max-w-md p-8">
      <div class="bg-white rounded-3xl shadow-lg p-8 text-center">
        <!-- Loading State -->
        <div v-if="isProcessing" class="space-y-4">
          <div class="flex justify-center">
            <Icon name="ri:loader-4-line" size="48" class="animate-spin text-blue-600" />
          </div>
          <h2 class="text-2xl font-bold text-gray-900">Completing sign in...</h2>
          <p class="text-sm text-gray-500">Please wait while we verify your account</p>
        </div>

        <!-- Success State -->
        <div v-else-if="isSuccess" class="space-y-4">
          <div class="flex justify-center">
            <Icon name="ri:checkbox-circle-fill" size="48" class="text-green-500" />
          </div>
          <h2 class="text-2xl font-bold text-gray-900">Sign in successful!</h2>
          <p class="text-sm text-gray-500">Redirecting to your dashboard...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="space-y-4">
          <div class="flex justify-center">
            <Icon name="ri:error-warning-fill" size="48" class="text-red-500" />
          </div>
          <h2 class="text-2xl font-bold text-gray-900">Sign in failed</h2>
          <p class="text-sm text-red-600 mb-4">{{ error }}</p>
          <div class="space-y-2">
            <NuxtLink
              to="/"
              class="block w-full px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Return to Home
            </NuxtLink>
            <button
              @click="retry"
              class="block w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
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
import { ref, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'

const { initAuth, isAuthenticated, user } = useAuth()

const isProcessing = ref(true)
const isSuccess = ref(false)
const error = ref<string | null>(null)

const processCallback = async () => {
  try {
    isProcessing.value = true
    error.value = null

    // Initialize auth to detect the session after OAuth redirect
    await initAuth()

    // Give Supabase a brief moment to update the session
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (isAuthenticated.value && user.value) {
      isSuccess.value = true

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigateTo('/dashboard')
      }, 1500)
    } else {
      const urlParams = new URLSearchParams(window.location.search)
      const errorDescription = urlParams.get('error_description')
      const errorCode = urlParams.get('error')

      if (errorDescription) {
        error.value = decodeURIComponent(errorDescription)
      } else if (errorCode) {
        error.value = `Authentication error: ${errorCode}`
      } else {
        error.value = 'Failed to complete sign in. Please try again.'
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

