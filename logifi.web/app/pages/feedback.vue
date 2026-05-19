<template>
  <div
    :class="[
      'min-h-screen transition-colors duration-300 font-quicksand',
      isFromLanding
        ? 'relative overflow-x-hidden bg-[#e4e8e7] text-gray-900'
        : theme === 'dark'
          ? 'bg-gray-950'
          : 'bg-gray-50'
    ]"
  >
    <TechnicalTopographyBg v-if="isFromLanding" />
    <div :class="isFromLanding ? 'relative z-10' : 'contents'">
    <header v-if="isFromLanding" class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/10 bg-white/5 backdrop-blur-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div class="flex items-center">
          <NuxtLink to="/" class="flex items-center">
            <img src="/images/logifi-logo.png" alt="Logifi" class="h-32 w-auto brightness-0" />
          </NuxtLink>
        </div>

        <nav class="hidden md:flex items-center space-x-8">
          <NuxtLink to="/#features" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Features</NuxtLink>
          <NuxtLink to="/integrations" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Integrations</NuxtLink>
          <NuxtLink to="/pricing" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Pricing</NuxtLink>
          <NuxtLink to="/developers?from=landing" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Developers</NuxtLink>
          <NuxtLink to="/feedback?from=landing" class="text-sm font-medium text-blue-600 transition-colors dark:text-blue-600">Feedback</NuxtLink>
          <div class="h-4 w-px bg-gray-200 dark:bg-gray-200"></div>
          <button
            type="button"
            class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600"
            @click="openAuth('signin')"
          >
            Sign In
          </button>
          <button
            type="button"
            class="btn-cta-primary px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all ring-1 ring-blue-400/60 shadow-[0_0_16px_-3px_rgba(37,99,235,0.48),0_0_32px_-12px_rgba(59,130,246,0.22)] hover:shadow-[0_0_24px_-2px_rgba(37,99,235,0.55),0_0_40px_-10px_rgba(59,130,246,0.28)] active:scale-[0.98] dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
            @click="openAuth('signup')"
          >
            <span class="relative z-10">Get Started</span>
          </button>
        </nav>

        <button type="button" class="md:hidden p-2 text-gray-600 dark:text-gray-600" aria-label="Open menu">
          <Icon name="ri:menu-line" size="24" />
        </button>
      </div>
    </header>

    <header v-else>
      <div class="fixed top-0 left-0 right-0 z-50 transition-colors duration-300 bg-transparent">
        <div class="mr-auto px-6 sm:px-8 py-4 flex items-center justify-between relative">
          <a class="left" href="/">
            <img
              src="/images/logifi-logo.png"
              alt="logifi"
              :class="[
                'h-20 sm:h-24 lg:h-28 w-auto transition-all duration-300',
                effectiveDark ? '' : 'brightness-[0.2]'
              ]"
            />
          </a>

          <div class="absolute inset-x-0 flex justify-center pointer-events-none">
            <span
              :class="[
                'px-3 py-1 rounded-md text-xl font-quicksand font-semibold select-none',
                effectiveDark ? 'text-gray-200' : 'text-gray-800'
              ]"
              aria-live="polite"
            >
              {{ displayClock }}
            </span>
          </div>

          <nav class="flex items-center gap-3 relative z-10">
            <a
              href="https://discord.gg/hBaDkNt2ev"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center px-4 py-2 rounded-xl text-sm font-quicksand font-bold transition-all duration-200 bg-[#5865F2] hover:bg-[#4752C4] text-white"
            >
              <Icon name="ri:discord-fill" size="18" class="mr-2" />
              Join Community
            </a>
            <button
              type="button"
              class="inline-flex items-center px-4 py-2 rounded-xl text-sm font-quicksand font-bold transition-all duration-200"
              :class="
                effectiveDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
              "
              @click="goBack"
            >
              <Icon name="ri:arrow-left-line" size="18" class="mr-2" />
              {{ backButtonText }}
            </button>
          </nav>
        </div>
      </div>
    </header>

    <main
      :class="[
        'pb-16 px-4 sm:px-6 lg:px-8',
        isFromLanding ? 'pt-32' : 'pt-24'
      ]"
    >
      <div
        :class="[
          'max-w-2xl mx-auto rounded-3xl p-8 sm:p-12 border transition-all duration-500',
          isFromLanding 
            ? 'relative overflow-hidden border-white/15 bg-white/10 backdrop-blur-md shadow-[0_0_42px_-12px_rgba(59,130,246,0.24),0_0_56px_-18px_rgba(37,99,235,0.14)]' 
            : (effectiveDark ? 'bg-gray-900 border-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)]' : 'bg-white border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)]')
        ]"
      >
        <div class="text-center mb-10">
          <div
            :class="[
              'inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-lg',
              isFromLanding ? 'bg-blue-600 shadow-[0_0_24px_-2px_rgba(37,99,235,0.55)]' : (effectiveDark ? 'bg-blue-900/50' : 'bg-blue-600 shadow-blue-900/20')
            ]"
          >
            <Icon name="ri:feedback-line" size="32" class="text-white" />
          </div>
          <h1
            :class="[
              'font-bold font-quicksand mb-4',
              isFromLanding ? 'text-4xl text-gray-950 dark:text-gray-900 drop-shadow-sm' : ['text-4xl', effectiveDark ? 'text-white' : 'text-gray-900']
            ]"
          >
            Feedback
          </h1>
          <p
            :class="[
              'max-w-xl mx-auto',
              isFromLanding ? 'text-lg text-gray-800 dark:text-gray-700 font-medium' : ['text-lg', effectiveDark ? 'text-gray-400' : 'text-gray-600']
            ]"
          >
            Report a bug, suggest a feature, or share general feedback. We read everything.
          </p>
        </div>

        <div
          v-if="submitStatus === 'success'"
          :class="[
            'mb-6 p-4 rounded-xl border',
            isFromLanding ? 'bg-green-100/50 border-green-200 text-green-800 dark:bg-green-100/50 dark:border-green-200 dark:text-green-800' : (effectiveDark ? 'bg-green-900/20 border-green-700 text-green-200' : 'bg-green-50 border-green-200 text-green-800')
          ]"
        >
          <p class="font-quicksand font-medium">Thanks! Your feedback has been sent.</p>
        </div>
        <div
          v-else-if="submitStatus === 'not-configured'"
          :class="[
            'mb-6 p-4 rounded-xl border',
            isFromLanding ? 'bg-amber-100/50 border-amber-200 text-amber-800 dark:bg-amber-100/50 dark:border-amber-200 dark:text-amber-800' : (effectiveDark ? 'bg-amber-900/20 border-amber-700 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800')
          ]"
        >
          <p class="font-quicksand font-medium">Feedback is not set up on this instance.</p>
          <p :class="['text-sm mt-2', isFromLanding ? 'text-amber-800 dark:text-amber-800' : (effectiveDark ? 'text-amber-300/90' : 'text-amber-700')]">
            You can open an issue on <a href="https://github.com/Logifi-LLC/Logifi-Core" target="_blank" rel="noopener noreferrer" class="underline">GitHub</a> or join our <a href="https://discord.gg/hBaDkNt2ev" target="_blank" rel="noopener noreferrer" class="underline">Discord</a> to share your thoughts.
          </p>
        </div>
        <div
          v-else-if="submitStatus === 'error'"
          :class="[
            'mb-6 p-4 rounded-xl border',
            isFromLanding ? 'bg-red-100/50 border-red-200 text-red-800 dark:bg-red-100/50 dark:border-red-200 dark:text-red-800' : (effectiveDark ? 'bg-red-900/20 border-red-700 text-red-200' : 'bg-red-50 border-red-200 text-red-800')
          ]"
        >
          <p class="font-quicksand font-medium">{{ submitError }}</p>
        </div>

        <form
          v-if="submitStatus !== 'success'"
          class="space-y-6"
          @submit.prevent="onSubmit"
        >
          <div>
            <label :class="['block text-sm font-quicksand font-medium mb-2', isFromLanding ? 'text-gray-950 dark:text-gray-900' : (effectiveDark ? 'text-gray-300' : 'text-gray-700')]">Type</label>
            <div class="flex flex-wrap gap-4">
              <label :class="['inline-flex items-center gap-2 cursor-pointer', isFromLanding ? 'text-gray-950 dark:text-gray-900 font-medium' : (effectiveDark ? 'text-gray-300' : 'text-gray-700')]">
                <input v-model="form.type" type="radio" value="bug" :class="['rounded border-gray-400', isFromLanding ? 'bg-white/40 dark:bg-white/40' : '']" />
                <span>Bug</span>
              </label>
              <label :class="['inline-flex items-center gap-2 cursor-pointer', isFromLanding ? 'text-gray-950 dark:text-gray-900 font-medium' : (effectiveDark ? 'text-gray-300' : 'text-gray-700')]">
                <input v-model="form.type" type="radio" value="feature" :class="['rounded border-gray-400', isFromLanding ? 'bg-white/40 dark:bg-white/40' : '']" />
                <span>Feature request</span>
              </label>
              <label :class="['inline-flex items-center gap-2 cursor-pointer', isFromLanding ? 'text-gray-950 dark:text-gray-900 font-medium' : (effectiveDark ? 'text-gray-300' : 'text-gray-700')]">
                <input v-model="form.type" type="radio" value="other" :class="['rounded border-gray-400', isFromLanding ? 'bg-white/40 dark:bg-white/40' : '']" />
                <span>Other</span>
              </label>
            </div>
          </div>

          <div>
            <label :class="['block text-sm font-quicksand font-medium mb-2', isFromLanding ? 'text-gray-950 dark:text-gray-900' : (effectiveDark ? 'text-gray-300' : 'text-gray-700')]">Subject</label>
            <input
              v-model="form.subject"
              type="text"
              required
              maxlength="200"
              placeholder="Short summary"
              :class="[
                'w-full px-4 py-3 rounded-xl border font-quicksand placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all',
                isFromLanding
                  ? 'bg-white/40 border-white/20 text-gray-900 dark:bg-white/40 dark:border-white/20 dark:text-gray-900'
                  : (effectiveDark
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900')
              ]"
            />
          </div>

          <div>
            <label :class="['block text-sm font-quicksand font-medium mb-2', isFromLanding ? 'text-gray-950 dark:text-gray-900' : (effectiveDark ? 'text-gray-300' : 'text-gray-700')]">Message</label>
            <textarea
              v-model="form.message"
              required
              rows="5"
              maxlength="2000"
              placeholder="Describe your bug report or feature idea..."
              :class="[
                'w-full px-4 py-3 rounded-xl border font-quicksand placeholder-gray-400 resize-y focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all',
                isFromLanding
                  ? 'bg-white/40 border-white/20 text-gray-900 dark:bg-white/40 dark:border-white/20 dark:text-gray-900'
                  : (effectiveDark
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900')
              ]"
            />
          </div>

          <div>
            <label :class="['block text-sm font-quicksand font-medium mb-2', isFromLanding ? 'text-gray-950 dark:text-gray-900' : (effectiveDark ? 'text-gray-300' : 'text-gray-700')]">Email (optional)</label>
            <input
              v-model="form.email"
              type="email"
              maxlength="320"
              placeholder="For follow-up"
              :class="[
                'w-full px-4 py-3 rounded-xl border font-quicksand placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all',
                isFromLanding
                  ? 'bg-white/40 border-white/20 text-gray-900 dark:bg-white/40 dark:border-white/20 dark:text-gray-900'
                  : (effectiveDark
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900')
              ]"
            />
          </div>

          <div class="sr-only" aria-hidden="true">
            <label for="feedback-website">Website</label>
            <input id="feedback-website" v-model="form.website" type="text" tabindex="-1" autocomplete="off" />
          </div>

          <button
            type="submit"
            :disabled="isSubmitting"
            :class="[
              'w-full sm:w-auto px-8 py-4 rounded-xl font-quicksand font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20',
              effectiveDark
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            ]"
          >
            {{ isSubmitting ? 'Sending...' : 'Send feedback' }}
          </button>
        </form>

      </div>
    </main>

    <!-- Marketing Footer -->
    <footer v-if="isFromLanding" class="relative z-10 border-t border-white/10 bg-white/5 backdrop-blur-md pb-6 pt-2 mt-12 transition-colors duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 text-center">
        <p class="text-sm font-medium text-gray-600 dark:text-gray-600">
          <NuxtLink to="/integrations" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Integrations</NuxtLink>
          <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
          <NuxtLink to="/pricing" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Pricing</NuxtLink>
          <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
          <NuxtLink to="/data-sources?from=landing" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Data sources</NuxtLink>
          <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
          <NuxtLink to="/terms?from=landing" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Terms of Service</NuxtLink>
          <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
          <NuxtLink to="/privacy?from=landing" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Privacy Policy</NuxtLink>
        </p>
      </div>
    </footer>

    <!-- Auth Modal -->
    <ClientOnly>
      <AuthModal 
        v-if="showAuth" 
        :initial-tab="authTab"
        @close="showAuth = false" 
        @success="handleAuthSuccess"
      />
    </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from '#imports'
import AuthModal from '~/components/AuthModal.vue'
import TechnicalTopographyBg from '~/components/TechnicalTopographyBg.vue'

const route = useRoute()
const router = useRouter()

const showAuth = ref(false)
const authTab = ref<'signin' | 'signup'>('signin')

const openAuth = (tab: 'signin' | 'signup') => {
  authTab.value = tab
  showAuth.value = true
}

const handleAuthSuccess = () => {
  window.location.href = '/dashboard'
}

const backTarget = computed(() => {
  const from = route.query.from
  if (from === 'landing') return '/'
  if (from === 'dashboard' || from === 'app') return '/dashboard'
  return '/dashboard'
})

const goBack = () => {
  const from = route.query.from
  if (from === 'landing') {
    router.push('/')
    return
  }
  if (from === 'dashboard' || from === 'app') {
    router.push('/dashboard')
    return
  }
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
  } else {
    router.push(backTarget.value)
  }
}

const backButtonText = computed(() => (route.query.from === 'landing' ? 'Back to Home' : 'Back to Logbook'))

const { theme, isDark, applyDocumentTheme } = useTheme()
const isFromLanding = computed(() => route.query.from === 'landing')
const effectiveDark = computed(() => isDark.value && !isFromLanding.value)

if (import.meta.client) {
  watch(isFromLanding, (val) => {
    if (val) applyDocumentTheme('light')
    else applyDocumentTheme(theme.value)
  }, { immediate: true })
  onBeforeUnmount(() => {
    applyDocumentTheme(theme.value)
  })
  watch(theme, (t) => {
    if (isFromLanding.value) applyDocumentTheme('light')
    else applyDocumentTheme(t)
  })
}

const form = ref({
  type: 'bug' as 'bug' | 'feature' | 'other',
  subject: '',
  message: '',
  email: '',
  website: ''
})

const isSubmitting = ref(false)
const submitStatus = ref<'idle' | 'success' | 'error' | 'not-configured'>('idle')
const submitError = ref('')

type ClockFormat = '12' | '24'
type ClockZone = 'UTC' | 'Local'
const clockFormat = ref<ClockFormat>('24')
const clockZone = ref<ClockZone>('UTC')
const now = ref<Date>(new Date())
let clockTimer: number | null = null

const displayClock = computed(() => {
  const date = now.value
  const use12Hour = clockFormat.value === '12'
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: use12Hour,
    timeZone: clockZone.value === 'UTC' ? 'UTC' : undefined
  }
  const time = date.toLocaleTimeString(undefined, options)
  return clockZone.value === 'UTC' ? `${time} UTC` : time
})

function loadClockPrefs() {
  if (import.meta.server) return
  const savedFmt = window.localStorage.getItem('logifi-clock-format')
  const savedZone = window.localStorage.getItem('logifi-clock-zone')
  if (savedFmt === '12' || savedFmt === '24') clockFormat.value = savedFmt
  if (savedZone === 'UTC' || savedZone === 'Local') clockZone.value = savedZone
}

async function onSubmit() {
  submitStatus.value = 'idle'
  submitError.value = ''
  isSubmitting.value = true
  try {
    const res = await $fetch<{ success: boolean; notConfigured?: boolean }>('/api/feedback', {
      method: 'POST',
      body: {
        type: form.value.type,
        subject: form.value.subject.trim(),
        message: form.value.message.trim(),
        email: form.value.email.trim() || undefined,
        website: form.value.website
      }
    })
    if (res.notConfigured) {
      submitStatus.value = 'not-configured'
    } else if (res.success) {
      submitStatus.value = 'success'
      form.value = { type: 'bug', subject: '', message: '', email: '', website: '' }
    } else {
      submitStatus.value = 'error'
      submitError.value = 'Something went wrong. Please try again.'
    }
  } catch (e: unknown) {
    const err = e as { data?: { statusCode?: number; statusMessage?: string }; statusCode?: number; statusMessage?: string; message?: string }
    const status = err?.data?.statusCode ?? err?.statusCode
    const msg = err?.data?.statusMessage ?? err?.statusMessage ?? err?.message
    if (status === 429) {
      submitStatus.value = 'error'
      submitError.value = 'Too many submissions. Please wait a few minutes and try again.'
    } else if (status === 400 && msg) {
      submitStatus.value = 'error'
      submitError.value = String(msg)
    } else {
      submitStatus.value = 'error'
      submitError.value = 'Failed to send feedback. Please try again or use GitHub/Discord.'
    }
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  if (route.query.from === 'landing') return
  loadClockPrefs()
  clockTimer = window.setInterval(() => { now.value = new Date() }, 1000)
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
})
</script>

<style>
@keyframes cta-shimmer {
  0%,
  100% {
    transform: translateX(-140%) skewX(-14deg);
  }
  50% {
    transform: translateX(140%) skewX(-14deg);
  }
}

.btn-cta-primary {
  position: relative;
  overflow: hidden;
}

.btn-cta-primary::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(
    105deg,
    transparent 38%,
    rgba(255, 255, 255, 0.12) 50%,
    transparent 62%
  );
  animation: cta-shimmer 3.2s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .btn-cta-primary::after {
    animation: none;
    opacity: 0;
  }
}
</style>
