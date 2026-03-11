<template>
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div
      :class="[
        'relative w-full max-w-md rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] transition-all duration-500 overflow-hidden',
        isDarkMode 
          ? 'bg-gray-900 border border-gray-800' 
          : 'bg-white border border-gray-100'
      ]"
      @click.stop
    >
      <!-- Top Branding Section -->
      <div class="pt-10 pb-6 flex flex-col items-center border-b" :class="[isDarkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-50 bg-gray-50/50']">
        <img src="/images/logifi-logo.png" alt="Logifi" class="h-12 w-auto mb-4" />
        <h3 :class="['text-2xl font-bold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
          {{ activeTab === 'signin' ? 'Welcome Back' : 'Create Account' }}
        </h3>
        <p :class="['text-sm font-quicksand mt-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
          {{ activeTab === 'signin' ? 'Log in to access your flight logs' : 'Join 500+ pilots digitizing their history' }}
        </p>
        
        <button
          @click="$emit('close')"
          :class="[
            'absolute top-4 right-4 p-2 rounded-full transition-all',
            isDarkMode 
              ? 'text-gray-500 hover:text-white hover:bg-gray-800' 
              : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
          ]"
          aria-label="Close"
        >
          <Icon name="ri:close-line" size="20" />
        </button>
      </div>

      <!-- Tabs Navigation -->
      <div class="flex p-1 mx-6 mt-6 rounded-xl bg-gray-100/50" :class="[isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100/50']">
        <button
          @click="activeTab = 'signin'"
          :class="[
            'flex-1 py-2 text-sm font-bold font-quicksand rounded-lg transition-all duration-200',
            activeTab === 'signin'
              ? (isDarkMode 
                  ? 'bg-gray-700 text-blue-400 shadow-sm' 
                  : 'bg-white text-blue-600 shadow-sm')
              : (isDarkMode 
                  ? 'text-gray-500 hover:text-gray-300' 
                  : 'text-gray-500 hover:text-gray-700')
          ]"
        >
          Sign In
        </button>
        <button
          @click="activeTab = 'signup'"
          :class="[
            'flex-1 py-2 text-sm font-bold font-quicksand rounded-lg transition-all duration-200',
            activeTab === 'signup'
              ? (isDarkMode 
                  ? 'bg-gray-700 text-blue-400 shadow-sm' 
                  : 'bg-white text-blue-600 shadow-sm')
              : (isDarkMode 
                  ? 'text-gray-500 hover:text-gray-300' 
                  : 'text-gray-500 hover:text-gray-700')
          ]"
        >
          Sign Up
        </button>
      </div>

      <!-- Main Form Content -->
      <div class="p-8 space-y-6">
        <!-- Social Login -->
        <div class="space-y-3">
          <button
            @click="handleGoogleSignIn"
            :disabled="isLoading"
            class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border transition-all font-bold text-sm font-quicksand"
            :class="[
              isDarkMode 
                ? 'border-gray-700 text-white hover:bg-gray-800' 
                : 'border-gray-200 text-gray-700 hover:bg-gray-50',
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            ]"
          >
            <Icon 
              v-if="!isLoading" 
              name="logos:google-icon" 
              size="18" 
            />
            <Icon 
              v-else 
              name="ri:loader-4-line" 
              size="18" 
              class="animate-spin" 
            />
            {{ isLoading ? 'Connecting...' : 'Continue with Google' }}
          </button>
        </div>

        <div class="relative flex items-center justify-center">
          <div class="w-full border-t border-gray-100" :class="[isDarkMode ? 'border-gray-800' : 'border-gray-100']"></div>
          <span class="absolute px-4 text-xs font-bold text-gray-400 bg-white" :class="[isDarkMode ? 'bg-gray-900' : 'bg-white']">OR</span>
        </div>

        <!-- Feedback Messages -->
        <div v-if="authError || successMessage" class="animate-fade-in">
          <div
            v-if="authError"
            :class="[
              'rounded-xl border p-4 flex items-start gap-3',
              isDarkMode 
                ? 'bg-red-900/20 border-red-800 text-red-300' 
                : 'bg-red-50 border-red-100 text-red-700'
            ]"
          >
            <Icon name="ri:error-warning-fill" size="20" class="flex-shrink-0" />
            <p class="text-sm font-medium font-quicksand">{{ authError }}</p>
          </div>

          <div
            v-if="successMessage"
            :class="[
              'rounded-xl border p-4 flex items-start gap-3',
              isDarkMode 
                ? 'bg-green-900/20 border-green-800 text-green-300' 
                : 'bg-green-50 border-green-100 text-green-700'
            ]"
          >
            <Icon name="ri:checkbox-circle-fill" size="20" class="flex-shrink-0" />
            <p class="text-sm font-medium font-quicksand">{{ successMessage }}</p>
          </div>
        </div>

        <!-- Email Field -->
        <div class="space-y-2">
          <label 
            class="text-xs font-bold font-quicksand uppercase tracking-wider" 
            :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']"
            for="email"
          >
            Email Address
          </label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
              <Icon name="ri:mail-line" size="18" />
            </span>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              :disabled="isLoading"
              :class="[
                'w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-quicksand transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none',
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400',
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              ]"
              placeholder="pilot@logifi.io"
              @keyup.enter="handleSubmit"
            />
          </div>
        </div>

        <!-- Password Field -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label 
              class="text-xs font-bold font-quicksand uppercase tracking-wider" 
              :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']"
              for="password"
            >
              Password
            </label>
            <button 
              v-if="activeTab === 'signin'"
              type="button"
              class="text-xs font-bold text-blue-600 hover:text-blue-700 font-quicksand"
            >
              Forgot password?
            </button>
          </div>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
              <Icon name="ri:lock-password-line" size="18" />
            </span>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              :disabled="isLoading"
              :class="[
                'w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-quicksand transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none',
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400',
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              ]"
              placeholder="••••••••"
              @keyup.enter="handleSubmit"
            />
          </div>
          <p 
            v-if="activeTab === 'signup'"
            class="text-[10px] font-medium font-quicksand leading-tight mt-2"
            :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']"
          >
            By signing up, you agree to our
            <NuxtLink to="/terms" class="text-blue-500 hover:text-blue-600 hover:underline">Terms of Service</NuxtLink>
            and
            <NuxtLink to="/privacy" class="text-blue-500 hover:text-blue-600 hover:underline">Privacy Policy</NuxtLink>.
          </p>
        </div>

        <!-- Submit Button -->
        <button
          @click="handleSubmit"
          :disabled="!isFormValid || isLoading"
          :class="[
            'w-full py-4 rounded-xl font-bold font-quicksand text-sm transition-all shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98]',
            (!isFormValid || isLoading)
              ? (isDarkMode ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200')
              : 'bg-blue-600 text-white hover:bg-blue-700'
          ]"
        >
          <span v-if="isLoading" class="flex items-center justify-center gap-2">
            <Icon name="ri:loader-4-line" size="20" class="animate-spin" />
            Processing...
          </span>
          <span v-else>
            {{ activeTab === 'signin' ? 'Sign In to Logifi' : 'Create My Account' }}
          </span>
        </button>

        <!-- Footer Help -->
        <p class="text-center text-xs font-medium font-quicksand text-gray-400 mt-6">
          Need help? <a href="mailto:info@logifi.io" class="text-blue-600 hover:underline">Contact Support</a>
        </p>
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

