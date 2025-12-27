<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    @click.self="$emit('close')"
  >
    <div
      :class="[
        'relative w-full max-w-md rounded-2xl border shadow-2xl transition-colors duration-300',
        isDarkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-gray-200 border-gray-300'
      ]"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
        <h3 :class="['text-xl font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
          {{ activeTab === 'signin' ? 'Sign In' : 'Sign Up' }}
        </h3>
        <button
          @click="$emit('close')"
          :class="[
            'p-1 rounded-lg transition-colors',
            isDarkMode 
              ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-300'
          ]"
          aria-label="Close"
        >
          <Icon name="ri:close-line" size="24" />
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-300']">
        <button
          @click="activeTab = 'signin'"
          :class="[
            'flex-1 px-4 py-3 text-sm font-semibold font-quicksand transition-colors',
            activeTab === 'signin'
              ? (isDarkMode 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-blue-600 border-b-2 border-blue-600')
              : (isDarkMode 
                  ? 'text-gray-400 hover:text-gray-300' 
                  : 'text-gray-600 hover:text-gray-900')
          ]"
        >
          Sign In
        </button>
        <button
          @click="activeTab = 'signup'"
          :class="[
            'flex-1 px-4 py-3 text-sm font-semibold font-quicksand transition-colors',
            activeTab === 'signup'
              ? (isDarkMode 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-blue-600 border-b-2 border-blue-600')
              : (isDarkMode 
                  ? 'text-gray-400 hover:text-gray-300' 
                  : 'text-gray-600 hover:text-gray-900')
          ]"
        >
          Sign Up
        </button>
      </div>

      <!-- Form -->
      <div class="p-6 space-y-4">
        <!-- Error Message -->
        <div
          v-if="authError"
          :class="[
            'rounded-lg border p-3 flex items-start gap-2',
            isDarkMode 
              ? 'bg-red-900/20 border-red-700 text-red-300' 
              : 'bg-red-50 border-red-200 text-red-700'
          ]"
        >
          <Icon name="ri:alert-line" size="20" class="flex-shrink-0 mt-0.5" />
          <div class="flex-1 text-sm font-quicksand">
            {{ authError }}
          </div>
          <button
            @click="authError = null"
            :class="[
              'flex-shrink-0 p-0.5 rounded hover:opacity-70',
              isDarkMode ? 'text-red-300' : 'text-red-700'
            ]"
            aria-label="Dismiss error"
          >
            <Icon name="ri:close-line" size="16" />
          </button>
        </div>

        <!-- Success Message -->
        <div
          v-if="successMessage"
          :class="[
            'rounded-lg border p-3 flex items-start gap-2',
            isDarkMode 
              ? 'bg-green-900/20 border-green-700 text-green-300' 
              : 'bg-green-50 border-green-200 text-green-700'
          ]"
        >
          <Icon name="ri:check-line" size="20" class="flex-shrink-0 mt-0.5" />
          <div class="flex-1 text-sm font-quicksand">
            {{ successMessage }}
          </div>
        </div>

        <!-- Email Input -->
        <div>
          <label 
            :class="['block text-sm font-semibold font-quicksand mb-2', isDarkMode ? 'text-gray-400' : 'text-gray-500']"
            for="email"
          >
            Email
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            :disabled="isLoading"
            :class="[
              'w-full rounded-lg border px-3 py-2 text-base font-quicksand transition-colors',
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            ]"
            placeholder="your.email@example.com"
            @keyup.enter="handleSubmit"
            @keyup.escape="$emit('close')"
          />
        </div>

        <!-- Password Input -->
        <div>
          <label 
            :class="['block text-sm font-semibold font-quicksand mb-2', isDarkMode ? 'text-gray-400' : 'text-gray-500']"
            for="password"
          >
            Password
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            :disabled="isLoading"
            :class="[
              'w-full rounded-lg border px-3 py-2 text-base font-quicksand transition-colors',
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            ]"
            placeholder="••••••••"
            @keyup.enter="handleSubmit"
            @keyup.escape="$emit('close')"
          />
          <p 
            v-if="activeTab === 'signup'"
            :class="['text-xs mt-1 font-quicksand', isDarkMode ? 'text-gray-500' : 'text-gray-400']"
          >
            Password must be at least 6 characters
          </p>
        </div>

        <!-- Submit Button -->
        <button
          @click="handleSubmit"
          :disabled="!isFormValid || isLoading"
          :class="[
            'w-full px-4 py-2 rounded-lg font-semibold font-quicksand transition-colors',
            (!isFormValid || isLoading)
              ? (isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
              : (isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700')
          ]"
        >
          <span v-if="isLoading" class="flex items-center justify-center gap-2">
            <Icon name="ri:loader-4-line" size="20" class="animate-spin" />
            {{ activeTab === 'signin' ? 'Signing In...' : 'Signing Up...' }}
          </span>
          <span v-else>
            {{ activeTab === 'signin' ? 'Sign In' : 'Sign Up' }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'

const props = defineProps<{
  isDarkMode?: boolean
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const { signUp, signIn, isLoading: authLoading, error: authErrorState } = useAuth()

const activeTab = ref<'signin' | 'signup'>('signin')
const email = ref('')
const password = ref('')
const authError = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isLoading = computed(() => authLoading.value)

// Watch for auth errors from composable
watch(authErrorState, (newError) => {
  if (newError) {
    authError.value = newError
    successMessage.value = null
  }
})

// Form validation
const isFormValid = computed(() => {
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
  const passwordValid = password.value.length >= 6
  return emailValid && passwordValid
})

// Handle form submission
const handleSubmit = async () => {
  if (!isFormValid.value || isLoading.value) return

  authError.value = null
  successMessage.value = null

  try {
    if (activeTab.value === 'signup') {
      const result = await signUp(email.value, password.value)
      if (result.success) {
        successMessage.value = 'Account created successfully! You are now signed in.'
        // Wait a moment to show success message, then close
        setTimeout(() => {
          emit('success')
          emit('close')
        }, 1500)
      } else if (result.error) {
        authError.value = result.error
      }
    } else {
      const result = await signIn(email.value, password.value)
      if (result.success) {
        successMessage.value = 'Signed in successfully!'
        // Wait a moment to show success message, then close
        setTimeout(() => {
          emit('success')
          emit('close')
        }, 1000)
      } else if (result.error) {
        authError.value = result.error
      }
    }
  } catch (error) {
    authError.value = error instanceof Error ? error.message : 'An unexpected error occurred'
  }
}

// Reset form when switching tabs
watch(activeTab, () => {
  authError.value = null
  successMessage.value = null
  password.value = ''
})
</script>

