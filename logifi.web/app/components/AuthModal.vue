<template>
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
    @click.self="handleBackdropClick"
  >
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      tabindex="-1"
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
        <LogifiAppLogo class="mb-4" />
        <h3
          id="auth-modal-title"
          :class="['text-2xl font-bold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']"
        >
          {{ modalTitle }}
        </h3>
        <p
          v-if="authPanel === 'form' && activeTab === 'signup'"
          :class="['text-sm font-quicksand mt-1', isDarkMode ? 'text-gray-400' : 'text-gray-500']"
        >
          Includes {{ welcomeCredits }} free Digifi spreads
        </p>
        
        <button
          v-if="dismissible"
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
      <div
        v-if="authPanel === 'form'"
        class="flex p-1 mx-6 mt-6 rounded-xl bg-gray-100/50"
        :class="[isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100/50']"
      >
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
      <div class="max-h-[min(70vh,40rem)] space-y-6 overflow-y-auto p-8">
        <div
          v-if="authPanel === 'check-inbox'"
          class="space-y-6"
          data-testid="auth-check-inbox"
        >
          <p
            :class="['text-sm font-quicksand leading-relaxed', isDarkMode ? 'text-gray-300' : 'text-gray-600']"
          >
            We sent a verification link to
            <span class="font-semibold break-all">{{ pendingSignupEmail }}</span>.
            Open it to activate your account, then sign in.
          </p>
          <div v-if="resendInboxFeedback" class="animate-fade-in">
            <div
              :class="[
                'rounded-xl border p-4 flex items-start gap-3',
                resendInboxFeedback.type === 'error'
                  ? isDarkMode
                    ? 'bg-red-900/20 border-red-800 text-red-300'
                    : 'bg-red-50 border-red-100 text-red-700'
                  : isDarkMode
                    ? 'bg-green-900/20 border-green-800 text-green-300'
                    : 'bg-green-50 border-green-100 text-green-700',
              ]"
            >
              <Icon
                :name="resendInboxFeedback.type === 'error' ? 'ri:error-warning-fill' : 'ri:checkbox-circle-fill'"
                size="20"
                class="flex-shrink-0"
              />
              <p class="text-sm font-medium font-quicksand">{{ resendInboxFeedback.message }}</p>
            </div>
          </div>
          <button
            type="button"
            class="w-full min-h-11 py-3 rounded-xl font-bold font-quicksand text-sm transition-all border"
            :class="[
              inboxResend.canResend
                ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600'
                : isDarkMode
                  ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed',
            ]"
            :disabled="!inboxResend.canResend || isResendingInbox"
            @click="handleResendAfterSignup"
          >
            <span v-if="isResendingInbox" class="inline-flex items-center justify-center gap-2">
              <Icon name="ri:loader-4-line" size="18" class="animate-spin" />
              Sending…
            </span>
            <span v-else-if="inboxResend.secondsRemaining > 0">
              Resend in {{ inboxResend.secondsRemaining }}s
            </span>
            <span v-else>Resend confirmation email</span>
          </button>
          <button
            type="button"
            class="w-full min-h-11 py-3 rounded-xl font-bold font-quicksand text-sm border transition-all"
            :class="[
              isDarkMode
                ? 'border-gray-700 text-gray-200 hover:bg-gray-800'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50',
            ]"
            @click="goToSignInAfterInbox"
          >
            Back to sign in
          </button>
        </div>

        <template v-else>
        <!-- Social Login -->
        <div class="space-y-3">
          <button
            v-if="showAppleSignIn"
            @click="handleAppleSignIn"
            :disabled="isLoading"
            class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border transition-all font-bold text-sm font-quicksand"
            :class="[
              isDarkMode
                ? 'border-gray-700 bg-black text-white hover:bg-gray-900'
                : 'border-gray-900 bg-black text-white hover:bg-gray-900',
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            ]"
          >
            <Icon
              v-if="!isLoading"
              name="ri:apple-fill"
              size="18"
            />
            <Icon
              v-else
              name="ri:loader-4-line"
              size="18"
              class="animate-spin"
            />
            {{ isLoading ? 'Connecting...' : 'Continue with Apple' }}
          </button>
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
            <div class="space-y-3 min-w-0">
              <p class="text-sm font-medium font-quicksand">{{ authError }}</p>
              <button
                v-if="showUnconfirmedResend"
                type="button"
                class="text-sm font-bold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline min-h-11"
                :disabled="!signInResend.canResend || isResendingSignIn"
                @click="handleResendFromSignIn"
              >
                <span v-if="isResendingSignIn">Sending…</span>
                <span v-else-if="signInResend.secondsRemaining > 0">
                  Resend confirmation ({{ signInResend.secondsRemaining }}s)
                </span>
                <span v-else>Resend confirmation email</span>
              </button>
              <p
                v-if="resendSignInFeedback?.type === 'error'"
                class="text-sm font-medium font-quicksand"
              >
                {{ resendSignInFeedback.message }}
              </p>
            </div>
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
              ref="emailInputRef"
              v-model="email"
              type="email"
              autocomplete="email"
              :disabled="isLoading"
              :aria-invalid="emailAriaInvalid"
              :aria-describedby="emailAriaDescribedBy"
              :class="[
                'w-full pl-11 pr-4 py-3 rounded-xl border text-base font-quicksand transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none',
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-600' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-300',
                emailAriaInvalid ? 'border-red-500' : '',
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              ]"
              placeholder="you@example.com"
              @blur="emailTouched = true"
              @keyup.enter="handleSubmit"
            />
          </div>
          <p
            v-if="visibleEmailError"
            id="auth-email-error"
            class="text-sm font-medium font-quicksand"
            :class="isDarkMode ? 'text-red-300' : 'text-red-700'"
            role="alert"
          >
            {{ visibleEmailError }}
          </p>
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
              @click="handleForgotPassword"
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
              ref="passwordInputRef"
              v-model="password"
              type="password"
              :autocomplete="activeTab === 'signup' ? 'new-password' : 'current-password'"
              :disabled="isLoading"
              :aria-invalid="passwordAriaInvalid"
              :aria-describedby="passwordAriaDescribedBy"
              :class="[
                'w-full pl-11 pr-4 py-3 rounded-xl border text-base font-quicksand transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none',
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-600' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-300',
                passwordAriaInvalid ? 'border-red-500' : '',
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              ]"
              placeholder=""
              @blur="passwordTouched = true"
              @keyup.enter="handleSubmit"
            />
          </div>
          <p
            v-if="visiblePasswordError"
            id="auth-password-error"
            class="text-sm font-medium font-quicksand"
            :class="isDarkMode ? 'text-red-300' : 'text-red-700'"
            role="alert"
          >
            {{ visiblePasswordError }}
          </p>
          <div v-if="activeTab === 'signup'" class="space-y-2 pt-2">
            <button
              v-if="!showReferralField"
              type="button"
              class="text-sm font-bold text-blue-600 hover:text-blue-700 min-h-11 text-left"
              @click="showReferralField = true"
            >
              Have a code?
            </button>
            <div v-else class="space-y-2">
              <label
                class="text-sm font-bold font-quicksand"
                :class="[isDarkMode ? 'text-gray-200' : 'text-gray-800']"
                for="referral-code"
              >
                Referral code
              </label>
              <input
                id="referral-code"
                v-model="referralCode"
                type="text"
                autocapitalize="characters"
                autocomplete="off"
                spellcheck="false"
                @input="referralTouched = true"
                :disabled="isLoading"
                :class="[
                  'w-full px-4 py-3 rounded-xl border text-base font-quicksand transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none',
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-600'
                    : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-300',
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                ]"
                placeholder="Optional"
              />
              <p v-if="referralApplied" class="text-sm font-semibold text-blue-600">Referral code applied</p>
            </div>
          </div>
          <p 
            v-if="activeTab === 'signup'"
            class="text-xs font-medium font-quicksand leading-snug mt-2"
            :class="[isDarkMode ? 'text-gray-400' : 'text-gray-600']"
          >
            By signing up, you agree to our
            <NuxtLink to="/terms" class="text-blue-500 hover:text-blue-600 hover:underline">Terms of Service</NuxtLink>
            and
            <NuxtLink to="/privacy" class="text-blue-500 hover:text-blue-600 hover:underline">Privacy Policy</NuxtLink>.
          </p>
        </div>

        <!-- Submit Button -->
        <button
          type="button"
          @click="handleSubmit"
          :disabled="isLoading"
          :class="[
            'w-full py-4 rounded-xl font-bold font-quicksand text-sm transition-all shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98]',
            isLoading
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
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { isCapacitorIos, resetIosInputZoom } from '~/composables/useCapacitorPlatform'
import { WELCOME_CREDITS } from '../../shared/creditsWelcome'
import { normalizeReferralCode } from '../../shared/referrals'
import {
  captureReferralFromSearch,
  clearStoredReferralCode,
  readStoredReferralCode,
  storeReferralCode,
} from '~/utils/referralCapture'
import { isEmailNotConfirmedError, signInErrorUserMessage } from '~/utils/authErrors'
import { useResendCooldown } from '~/composables/useResendCooldown'

const welcomeCredits = WELCOME_CREDITS

const props = withDefaults(
  defineProps<{
    isDarkMode?: boolean
    /** When false, hide close control and ignore backdrop dismiss (e.g. iOS login gate). */
    dismissible?: boolean
    /** Marketing pages pass this. Without it the modal always opens on Sign In. */
    initialTab?: 'signin' | 'signup'
    /** Bumps when a referral link opens signup on an already-visible modal. */
    referralOpenCount?: number
    /** One-line banner (e.g. after account deletion). */
    notice?: string | null
  }>(),
  { dismissible: true, initialTab: 'signin', referralOpenCount: 0, notice: null }
)

const emit = defineEmits<{
  close: []
  success: []
}>()

function handleBackdropClick() {
  if (props.dismissible) {
    emit('close')
  }
}

const {
  signUp,
  signIn,
  signInWithGoogle,
  signInWithApple,
  resetPassword,
  resendSignupConfirmation,
  isLoading: authLoading,
  error: authErrorState,
} = useAuth()

const inboxResend = useResendCooldown()
const signInResend = useResendCooldown()

const activeTab = ref<'signin' | 'signup'>(props.initialTab)
const authPanel = ref<'form' | 'check-inbox'>('form')
const pendingSignupEmail = ref('')
const showReferralField = ref(false)
const showUnconfirmedResend = ref(false)
const isResendingInbox = ref(false)
const isResendingSignIn = ref(false)
const resendInboxFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const resendSignInFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const modalTitle = computed(() => {
  if (authPanel.value === 'check-inbox') return 'Check your inbox'
  return activeTab.value === 'signin' ? 'Sign in' : 'Sign up'
})
const email = ref('')
const password = ref('')
const referralCode = ref('')
const referralTouched = ref(false)
const referralApplied = ref(false)
const emailTouched = ref(false)
const passwordTouched = ref(false)
const submitAttempted = ref(false)
const dialogRef = ref<HTMLElement | null>(null)
const emailInputRef = ref<HTMLInputElement | null>(null)
const passwordInputRef = ref<HTMLInputElement | null>(null)

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

let previousFocus: HTMLElement | null = null

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getClientRects().length > 0
  )
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    if (props.dismissible) emit('close')
    return
  }
  if (event.key !== 'Tab' || !dialogRef.value) return
  const nodes = getFocusable(dialogRef.value)
  if (nodes.length === 0) {
    event.preventDefault()
    dialogRef.value.focus()
    return
  }
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function onFocusIn(event: FocusEvent) {
  if (!dialogRef.value) return
  const target = event.target
  if (!(target instanceof Node) || dialogRef.value.contains(target)) return
  const nodes = getFocusable(dialogRef.value)
  ;(nodes[0] ?? dialogRef.value).focus()
}

function referralParamInUrl(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return Boolean(params.get('ref') || params.get('referral'))
}

function syncReferralFieldVisibility() {
  if (activeTab.value !== 'signup') return
  showReferralField.value =
  Boolean(referralCode.value.trim()) || referralApplied.value || referralParamInUrl()
}

function fillReferralFromStore() {
  const fromUrl = captureReferralFromSearch(window.location.search)
  if (fromUrl) storeReferralCode(fromUrl)
  const stored = readStoredReferralCode()
  if (!stored) {
    syncReferralFieldVisibility()
    return
  }
  referralCode.value = stored
  referralApplied.value = true
  showReferralField.value = true
}

watch(
  () => props.initialTab,
  (tab) => {
    activeTab.value = tab
    if (tab === 'signup') fillReferralFromStore()
  }
)

watch(
  () => props.referralOpenCount,
  (count) => {
    if (count > 0) fillReferralFromStore()
  }
)

function applyNoticeBanner() {
  if (!props.notice) return
  authPanel.value = 'form'
  activeTab.value = 'signin'
  successMessage.value = props.notice
  authError.value = null
}

watch(
  () => props.notice,
  () => applyNoticeBanner(),
  { immediate: true }
)

onMounted(() => {
  fillReferralFromStore()
  applyNoticeBanner()
  previousFocus =
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  document.addEventListener('keydown', onKeydown, true)
  document.addEventListener('focusin', onFocusIn)
  void nextTick(() => {
    const nodes = dialogRef.value ? getFocusable(dialogRef.value) : []
    ;(nodes[0] ?? dialogRef.value)?.focus()
  })
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown, true)
  document.removeEventListener('focusin', onFocusIn)
  previousFocus?.focus?.()
})

const authError = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isLoading = computed(() => authLoading.value)
/** Native Apple Sign In works on the iOS app only; web OAuth is not configured. */
const showAppleSignIn = isCapacitorIos()

// Watch for auth errors from composable
watch(authErrorState, (newError) => {
  if (newError) {
    authError.value = newError
    successMessage.value = null
  }
})

function emailErrorMessage(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'Enter your email address'
  if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address'
  return null
}

function passwordErrorMessage(value: string): string | null {
  if (!value) return 'Enter your password'
  if (value.length < 6) return 'Password must be at least 6 characters'
  return null
}

const isFormValid = computed(() => {
  return emailErrorMessage(email.value) === null && passwordErrorMessage(password.value) === null
})

const visibleEmailError = computed(() => {
  if (!emailTouched.value && !submitAttempted.value) return null
  return emailErrorMessage(email.value)
})

const visiblePasswordError = computed(() => {
  if (!passwordTouched.value && !submitAttempted.value) return null
  return passwordErrorMessage(password.value)
})

const emailAriaInvalid = computed(() => visibleEmailError.value !== null)
const passwordAriaInvalid = computed(() => visiblePasswordError.value !== null)
const emailAriaDescribedBy = computed(() =>
  visibleEmailError.value ? 'auth-email-error' : undefined
)
const passwordAriaDescribedBy = computed(() =>
  visiblePasswordError.value ? 'auth-password-error' : undefined
)

function persistTypedReferralCode(): boolean {
  const raw = referralCode.value.trim()
  if (!raw) {
    // An untouched empty field must not wipe a code captured from ?ref.
    if (activeTab.value === 'signup' && referralTouched.value) clearStoredReferralCode()
    return true
  }
  const code = normalizeReferralCode(raw)
  if (!code) {
    authError.value = 'Enter a valid code'
    successMessage.value = null
    return false
  }
  storeReferralCode(code)
  return true
}

function completeAuthSuccess(delayMs: number) {
  setTimeout(() => {
    resetIosInputZoom()
    emit('success')
    emit('close')
  }, delayMs)
}

// Handle form submission
const handleSubmit = async () => {
  if (isLoading.value) return

  submitAttempted.value = true
  emailTouched.value = true
  passwordTouched.value = true

  if (!isFormValid.value) {
    await nextTick()
    if (emailErrorMessage(email.value)) {
      emailInputRef.value?.focus()
    } else {
      passwordInputRef.value?.focus()
    }
    return
  }

  authError.value = null
  successMessage.value = null

  try {
    if (activeTab.value === 'signup') {
      if (!persistTypedReferralCode()) return
      const result = await signUp(email.value, password.value)
      if (result.success) {
        if (result.requiresEmailConfirmation) {
          pendingSignupEmail.value = email.value.trim()
          authPanel.value = 'check-inbox'
          authError.value = null
          successMessage.value = null
          resendInboxFeedback.value = null
          password.value = ''
        } else {
          successMessage.value = 'Account created successfully! You are now signed in.'
          completeAuthSuccess(1500)
        }
      } else if (result.error) {
        authError.value = result.error
      }
    } else {
      const result = await signIn(email.value, password.value)
      if (result.success) {
        successMessage.value = 'Signed in successfully!'
        showUnconfirmedResend.value = false
        resendSignInFeedback.value = null
        completeAuthSuccess(1000)
      } else if (result.error) {
        showUnconfirmedResend.value = isEmailNotConfirmedError(result.error)
        resendSignInFeedback.value = null
        authError.value = signInErrorUserMessage(result.error)
      }
    }
  } catch (error) {
    authError.value = error instanceof Error ? error.message : 'An unexpected error occurred'
  }
}

// Handle forgot password
const handleForgotPassword = async () => {
  if (isLoading.value) return

  const emailValue = email.value.trim()
  const emailValid = EMAIL_PATTERN.test(emailValue)

  if (!emailValid) {
    authError.value = 'Please enter a valid email address to reset your password.'
    successMessage.value = null
    return
  }

  authError.value = null
  successMessage.value = null

  const result = await resetPassword(emailValue)
  if (result.success) {
    successMessage.value = 'Password reset link sent. Please check your email.'
  } else if (result.error) {
    authError.value = result.error
  }
}

// Handle Apple sign in
const handleAppleSignIn = async () => {
  if (isLoading.value) return
  if (!persistTypedReferralCode()) return

  authError.value = null
  successMessage.value = null

  const result = await signInWithApple()
  if ('cancelled' in result && result.cancelled) return
  if (result.success) {
    // Native iOS returns a session immediately; web OAuth redirects away.
    if (isCapacitorIos()) {
      successMessage.value = 'Signed in successfully!'
      completeAuthSuccess(800)
    }
    return
  }
  if (result.error) {
    authError.value = result.error
  }
}

// Handle Google sign in
const handleGoogleSignIn = async () => {
  if (isLoading.value) return
  if (!persistTypedReferralCode()) return

  authError.value = null
  successMessage.value = null

  const result = await signInWithGoogle()
  if (!result.success && result.error) {
    authError.value = result.error
  }
}

async function handleResendAfterSignup() {
  if (!inboxResend.canResend.value || isResendingInbox.value || !pendingSignupEmail.value) return
  isResendingInbox.value = true
  resendInboxFeedback.value = null
  const result = await resendSignupConfirmation(pendingSignupEmail.value)
  isResendingInbox.value = false
  if (result.success) {
    resendInboxFeedback.value = { type: 'success', message: result.message }
    inboxResend.startCooldown()
  } else if (result.error) {
    resendInboxFeedback.value = { type: 'error', message: result.error }
  }
}

async function handleResendFromSignIn() {
  const emailValue = email.value.trim()
  if (!signInResend.canResend.value || isResendingSignIn.value || !emailValue) return
  isResendingSignIn.value = true
  resendSignInFeedback.value = null
  const result = await resendSignupConfirmation(emailValue)
  isResendingSignIn.value = false
  if (result.success) {
    resendSignInFeedback.value = { type: 'success', message: result.message }
    authError.value = null
    showUnconfirmedResend.value = false
    successMessage.value = result.message
    signInResend.startCooldown()
  } else if (result.error) {
    resendSignInFeedback.value = { type: 'error', message: result.error }
  }
}

function goToSignInAfterInbox() {
  authPanel.value = 'form'
  activeTab.value = 'signin'
  password.value = ''
  authError.value = null
  successMessage.value = null
}

// Reset form when switching tabs
watch(activeTab, () => {
  if (authPanel.value !== 'form') return
  authError.value = null
  if (!props.notice) {
    successMessage.value = null
  }
  showUnconfirmedResend.value = false
  resendSignInFeedback.value = null
  password.value = ''
  emailTouched.value = false
  passwordTouched.value = false
  submitAttempted.value = false
  syncReferralFieldVisibility()
})
</script>

