<template>
  <div
    :class="[
      'min-h-screen transition-colors duration-300 font-quicksand',
      isFromLanding
        ? 'bg-[#e4e8e7] text-gray-900'
        : theme === 'dark'
          ? 'bg-gray-900'
          : 'bg-gray-50'
    ]"
  >
    <!-- Marketing header (?from=landing) — matches integrations / landing shell -->
    <header v-if="isFromLanding">
      <div
        class="fixed top-0 left-0 right-0 z-50 border-b bg-white/80 backdrop-blur-md border-[#e4e8e7]"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <NuxtLink to="/" class="flex items-center">
            <img src="/images/logifi-logo.png" alt="Logifi" class="h-32 w-auto brightness-0" />
          </NuxtLink>
          <nav class="flex items-center gap-4 text-sm font-medium text-gray-600">
            <NuxtLink to="/pricing" class="hover:text-blue-600">Pricing</NuxtLink>
            <NuxtLink to="/" class="hover:text-blue-600">Home</NuxtLink>
          </nav>
        </div>
      </div>
    </header>

    <!-- App header (dashboard / default) -->
    <header v-else>
      <div
        :class="[
          'fixed top-0 left-0 right-0 z-10 transition-colors duration-300',
          effectiveDark ? 'border-gray-700/50' : 'border-gray-400/50'
        ]"
      >
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
              Back to Logbook
            </button>
          </nav>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main
      :class="[
        'pb-16 px-4 sm:px-6 lg:px-8',
        isFromLanding ? 'pt-28' : 'pt-24'
      ]"
    >
      <div class="max-w-4xl mx-auto">
        <!-- Hero Section -->
        <div class="text-center mb-12">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-6 shadow-lg shadow-blue-900/20">
            <Icon name="ri:open-source-line" size="32" class="text-white" />
          </div>
          <h1
            :class="[
              'font-bold font-quicksand mb-4',
              isFromLanding ? 'text-3xl text-gray-900' : ['text-4xl', effectiveDark ? 'text-white' : 'text-gray-900']
            ]"
          >
            Open Source
          </h1>
          <p
            :class="[
              'max-w-2xl mx-auto',
              isFromLanding ? 'text-lg text-gray-600' : ['text-lg', effectiveDark ? 'text-gray-400' : 'text-gray-600']
            ]"
          >
            Logifi-Core is open source software built by pilots, for pilots. Join our community and help shape the future of digital flight logging.
          </p>
        </div>

        <!-- Links Grid -->
        <div class="grid gap-6 md:grid-cols-2 mb-12">
          <!-- GitHub -->
          <a
            href="https://github.com/Logifi-LLC/Logifi-Core"
            target="_blank"
            rel="noopener noreferrer"
            :class="[
              'flex items-start gap-4 p-6 rounded-3xl border transition-all duration-200 hover:scale-[1.02] shadow-[0_20px_50px_rgba(0,0,0,0.15)]',
              effectiveDark 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-200' 
                : 'bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-800'
            ]"
          >
            <div :class="['flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', effectiveDark ? 'bg-gray-700' : 'bg-gray-200']">
              <Icon name="ri:github-fill" size="24" :class="effectiveDark ? 'text-white' : 'text-gray-900'" />
            </div>
            <div>
              <h3 :class="['font-semibold font-quicksand mb-1', effectiveDark ? 'text-white' : 'text-gray-900']">
                GitHub Repository
              </h3>
              <p :class="['text-sm', effectiveDark ? 'text-gray-400' : 'text-gray-600']">
                View source code, report issues, and submit pull requests.
              </p>
            </div>
            <Icon name="ri:external-link-line" size="18" :class="['flex-shrink-0 mt-1', effectiveDark ? 'text-gray-500' : 'text-gray-400']" />
          </a>

          <!-- Contributing -->
          <a
            href="https://github.com/Logifi-LLC/Logifi-Core/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noopener noreferrer"
            :class="[
              'flex items-start gap-4 p-6 rounded-3xl border transition-all duration-200 hover:scale-[1.02] shadow-[0_20px_50px_rgba(0,0,0,0.15)]',
              effectiveDark 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-200' 
                : 'bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-800'
            ]"
          >
            <div :class="['flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', effectiveDark ? 'bg-green-900/50' : 'bg-green-100']">
              <Icon name="ri:git-pull-request-line" size="24" :class="effectiveDark ? 'text-green-400' : 'text-green-600'" />
            </div>
            <div>
              <h3 :class="['font-semibold font-quicksand mb-1', effectiveDark ? 'text-white' : 'text-gray-900']">
                Contributing Guide
              </h3>
              <p :class="['text-sm', effectiveDark ? 'text-gray-400' : 'text-gray-600']">
                Learn how to contribute to the project and what we accept.
              </p>
            </div>
            <Icon name="ri:external-link-line" size="18" :class="['flex-shrink-0 mt-1', effectiveDark ? 'text-gray-500' : 'text-gray-400']" />
          </a>

          <!-- License -->
          <a
            href="https://github.com/Logifi-LLC/Logifi-Core/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            :class="[
              'flex items-start gap-4 p-6 rounded-3xl border transition-all duration-200 hover:scale-[1.02] shadow-[0_20px_50px_rgba(0,0,0,0.15)]',
              effectiveDark 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-200' 
                : 'bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-800'
            ]"
          >
            <div :class="['flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', effectiveDark ? 'bg-purple-900/50' : 'bg-purple-100']">
              <Icon name="ri:scales-3-line" size="24" :class="effectiveDark ? 'text-purple-400' : 'text-purple-600'" />
            </div>
            <div>
              <h3 :class="['font-semibold font-quicksand mb-1', effectiveDark ? 'text-white' : 'text-gray-900']">
                License
              </h3>
              <p :class="['text-sm', effectiveDark ? 'text-gray-400' : 'text-gray-600']">
                Apache 2.0 License - free to use, modify, and distribute.
              </p>
            </div>
            <Icon name="ri:external-link-line" size="18" :class="['flex-shrink-0 mt-1', effectiveDark ? 'text-gray-500' : 'text-gray-400']" />
          </a>

          <!-- Code of Conduct -->
          <a
            href="https://github.com/Logifi-LLC/Logifi-Core/blob/main/CODE_OF_CONDUCT.md"
            target="_blank"
            rel="noopener noreferrer"
            :class="[
              'flex items-start gap-4 p-6 rounded-3xl border transition-all duration-200 hover:scale-[1.02] shadow-[0_20px_50px_rgba(0,0,0,0.15)]',
              effectiveDark 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-200' 
                : 'bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-800'
            ]"
          >
            <div :class="['flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', effectiveDark ? 'bg-orange-900/50' : 'bg-orange-100']">
              <Icon name="ri:heart-line" size="24" :class="effectiveDark ? 'text-orange-400' : 'text-orange-600'" />
            </div>
            <div>
              <h3 :class="['font-semibold font-quicksand mb-1', effectiveDark ? 'text-white' : 'text-gray-900']">
                Code of Conduct
              </h3>
              <p :class="['text-sm', effectiveDark ? 'text-gray-400' : 'text-gray-600']">
                Our community guidelines for a welcoming environment.
              </p>
            </div>
            <Icon name="ri:external-link-line" size="18" :class="['flex-shrink-0 mt-1', effectiveDark ? 'text-gray-500' : 'text-gray-400']" />
          </a>

          <!-- ICLA -->
          <a
            href="/images/ICLA.pdf"
            target="_blank"
            rel="noopener noreferrer"
            :class="[
              'flex items-start gap-4 p-6 rounded-3xl border transition-all duration-200 hover:scale-[1.02] shadow-[0_20px_50px_rgba(0,0,0,0.15)]',
              effectiveDark 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-200' 
                : 'bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-800'
            ]"
          >
            <div :class="['flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', effectiveDark ? 'bg-blue-900/50' : 'bg-blue-100']">
              <Icon name="ri:file-pdf-2-line" size="24" :class="effectiveDark ? 'text-blue-400' : 'text-blue-600'" />
            </div>
            <div>
              <h3 :class="['font-semibold font-quicksand mb-1', effectiveDark ? 'text-white' : 'text-gray-900']">
                Contributor License Agreement
              </h3>
              <p :class="['text-sm', effectiveDark ? 'text-gray-400' : 'text-gray-600']">
                Review and sign the CLA to contribute.
              </p>
            </div>
            <Icon name="ri:external-link-line" size="18" :class="['flex-shrink-0 mt-1', effectiveDark ? 'text-gray-500' : 'text-gray-400']" />
          </a>
        </div>

        <!-- Tech Stack -->
        <div :class="['rounded-2xl border p-8 shadow-sm', effectiveDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-800']">
          <h2 :class="['text-xl font-semibold font-quicksand mb-6', effectiveDark ? 'text-white' : 'text-gray-900']">
            Built With
          </h2>
          <div class="flex flex-wrap gap-3">
            <span
              v-for="tech in ['Nuxt 4', 'Vue 3', 'TypeScript', 'Tailwind CSS']"
              :key="tech"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-quicksand font-medium',
                effectiveDark ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700 border border-gray-200'
              ]"
            >
              {{ tech }}
            </span>
          </div>
        </div>

        <!-- Footer -->
        <div class="mt-12 text-center">
          <p :class="['text-sm', effectiveDark ? 'text-gray-500' : 'text-gray-500']">
            Made with ❤️ by the aviation community
          </p>
        </div>
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
  return '/dashboard' // default
})

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push(backTarget.value)
  }
}

const { theme, isDark } = useTheme()
/** `?from=landing` uses marketing shell; app chrome uses theme. */
const isFromLanding = computed(() => route.query.from === 'landing')
const effectiveDark = computed(() => isDark.value && !isFromLanding.value)

// Clock State
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
  if (clockZone.value === 'UTC') {
    return `${time} UTC`
  }
  return time
})

function loadClockPrefs(): void {
  // Check if we're in the browser environment
  if (import.meta.server) return
  
  const savedFmt = window.localStorage.getItem('logifi-clock-format')
  const savedZone = window.localStorage.getItem('logifi-clock-zone')
  if (savedFmt === '12' || savedFmt === '24') {
    clockFormat.value = savedFmt
  }
  if (savedZone === 'UTC' || savedZone === 'Local') {
    clockZone.value = savedZone
  }
}

onMounted(() => {
  if (route.query.from === 'landing') return
  loadClockPrefs()
  clockTimer = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (clockTimer) {
    clearInterval(clockTimer)
  }
})
</script>
