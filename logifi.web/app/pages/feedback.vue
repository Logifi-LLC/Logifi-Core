<template>
  <div
    :class="[
      'min-h-screen transition-colors duration-300 font-quicksand',
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-200'
    ]"
  >
    <header>
      <div
        :class="[
          'fixed top-0 left-0 right-0 z-10 transition-colors duration-300 bg-transparent'
        ]"
      >
        <div class="mr-auto px-6 sm:px-8 py-4 flex items-center justify-between relative">
          <a class="left" href="/">
            <img
              src="/images/logifi-logo.png"
              alt="logifi"
              :class="[
                'h-20 sm:h-24 lg:h-28 w-auto transition-all duration-300',
                isDarkMode ? '' : 'brightness-[0.2]'
              ]"
            />
          </a>

          <div class="absolute inset-x-0 flex justify-center pointer-events-none">
            <span
              :class="[
                'px-3 py-1 rounded-md text-xl font-quicksand font-semibold select-none',
                isDarkMode ? 'text-gray-200' : 'text-gray-800'
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
              :class="[
                'inline-flex items-center px-4 py-2 rounded-lg text-sm font-quicksand font-medium transition-all duration-200',
                'bg-[#5865F2] hover:bg-[#4752C4] text-white'
              ]"
            >
              <Icon name="ri:discord-fill" size="18" class="mr-2" />
              Join Community
            </a>
            <button
              type="button"
              @click="goBack"
              :class="[
                'inline-flex items-center px-4 py-2 rounded-lg text-sm font-quicksand font-medium transition-all duration-200',
                isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
              ]"
            >
              <Icon name="ri:arrow-left-line" size="18" class="mr-2" />
              {{ backButtonText }}
            </button>
          </nav>
        </div>
      </div>
    </header>

    <main class="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div class="max-w-2xl mx-auto">
        <div class="text-center mb-10">
          <div :class="['inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-lg', isDarkMode ? 'bg-blue-900/50' : 'bg-blue-600 shadow-blue-900/20']">
            <Icon name="ri:feedback-line" size="32" class="text-white" />
          </div>
          <h1 :class="['text-4xl font-bold font-quicksand mb-4', isDarkMode ? 'text-white' : 'text-gray-900']">
            Feedback
          </h1>
          <p :class="['text-lg max-w-xl mx-auto', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
            Report a bug, suggest a feature, or share general feedback. We read everything.
          </p>
        </div>

        <div
          v-if="submitStatus === 'success'"
          :class="[
            'mb-6 p-4 rounded-xl border',
            isDarkMode ? 'bg-green-900/20 border-green-700 text-green-200' : 'bg-green-50 border-green-200 text-green-800'
          ]"
        >
          <p class="font-quicksand font-medium">Thanks! Your feedback has been sent.</p>
        </div>
        <div
          v-else-if="submitStatus === 'not-configured'"
          :class="[
            'mb-6 p-4 rounded-xl border',
            isDarkMode ? 'bg-amber-900/20 border-amber-700 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'
          ]"
        >
          <p class="font-quicksand font-medium">Feedback is not set up on this instance.</p>
          <p :class="['text-sm mt-2', isDarkMode ? 'text-amber-300/90' : 'text-amber-700']">
            You can open an issue on <a href="https://github.com/Logifi-LLC/Logifi-Core" target="_blank" rel="noopener noreferrer" class="underline">GitHub</a> or join our <a href="https://discord.gg/hBaDkNt2ev" target="_blank" rel="noopener noreferrer" class="underline">Discord</a> to share your thoughts.
          </p>
        </div>
        <div
          v-else-if="submitStatus === 'error'"
          :class="[
            'mb-6 p-4 rounded-xl border',
            isDarkMode ? 'bg-red-900/20 border-red-700 text-red-200' : 'bg-red-50 border-red-200 text-red-800'
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
            <label :class="['block text-sm font-quicksand font-medium mb-2', isDarkMode ? 'text-gray-300' : 'text-gray-700']">Type</label>
            <div class="flex flex-wrap gap-4">
              <label :class="['inline-flex items-center gap-2 cursor-pointer', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                <input v-model="form.type" type="radio" value="bug" class="rounded border-gray-400" />
                <span>Bug</span>
              </label>
              <label :class="['inline-flex items-center gap-2 cursor-pointer', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                <input v-model="form.type" type="radio" value="feature" class="rounded border-gray-400" />
                <span>Feature request</span>
              </label>
              <label :class="['inline-flex items-center gap-2 cursor-pointer', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                <input v-model="form.type" type="radio" value="other" class="rounded border-gray-400" />
                <span>Other</span>
              </label>
            </div>
          </div>

          <div>
            <label :class="['block text-sm font-quicksand font-medium mb-2', isDarkMode ? 'text-gray-300' : 'text-gray-700']">Subject</label>
            <input
              v-model="form.subject"
              type="text"
              required
              maxlength="200"
              placeholder="Short summary"
              :class="[
                'w-full px-4 py-3 rounded-xl border font-quicksand placeholder-gray-400',
                isDarkMode
                  ? 'bg-gray-800 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
              ]"
            />
          </div>

          <div>
            <label :class="['block text-sm font-quicksand font-medium mb-2', isDarkMode ? 'text-gray-300' : 'text-gray-700']">Message</label>
            <textarea
              v-model="form.message"
              required
              rows="5"
              maxlength="2000"
              placeholder="Describe your bug report or feature idea..."
              :class="[
                'w-full px-4 py-3 rounded-xl border font-quicksand placeholder-gray-400 resize-y',
                isDarkMode
                  ? 'bg-gray-800 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
              ]"
            />
          </div>

          <div>
            <label :class="['block text-sm font-quicksand font-medium mb-2', isDarkMode ? 'text-gray-300' : 'text-gray-700']">Email (optional)</label>
            <input
              v-model="form.email"
              type="email"
              maxlength="320"
              placeholder="For follow-up"
              :class="[
                'w-full px-4 py-3 rounded-xl border font-quicksand placeholder-gray-400',
                isDarkMode
                  ? 'bg-gray-800 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
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
              'w-full sm:w-auto px-8 py-3 rounded-xl font-quicksand font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed',
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            ]"
          >
            {{ isSubmitting ? 'Sending...' : 'Send feedback' }}
          </button>
        </form>

      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from '#imports'

const route = useRoute()
const router = useRouter()

const backTarget = computed(() => {
  const from = route.query.from
  if (from === 'landing') return '/'
  if (from === 'dashboard' || from === 'app') return '/dashboard'
  return '/dashboard'
})

const goBack = () => {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
  } else {
    router.push(backTarget.value)
  }
}

const backButtonText = computed(() => (route.query.from === 'landing' ? 'Back to Home' : 'Back to Logbook'))

const { theme, isDark: isDarkMode } = useTheme()

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
  loadClockPrefs()
  clockTimer = window.setInterval(() => { now.value = new Date() }, 1000)
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
})
</script>
