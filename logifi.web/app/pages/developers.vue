<template>
  <div
    :class="[
      'min-h-screen transition-colors duration-300 font-quicksand',
      isFromLanding
        ? 'relative overflow-x-hidden bg-[#e4e8e7] text-gray-900'
        : theme === 'dark'
          ? 'bg-gray-900'
          : 'bg-gray-50'
    ]"
  >
    <TechnicalTopographyBg v-if="isFromLanding" />
    <div :class="isFromLanding ? 'relative z-10' : 'contents'">
    <MarketingHeader v-if="isFromLanding" active-page="developers" @open-auth="openAuth" />

    <!-- App header — iOS compact (from dashboard / in-app) -->
    <header v-else-if="isAppShell && isIos">
      <div
        :class="[
          'fixed top-0 inset-x-0 z-50 pt-[env(safe-area-inset-top)] transition-colors duration-300',
          effectiveDark ? 'bg-gray-900/95 border-b border-gray-700/50' : 'bg-gray-50/95 border-b border-gray-200/80'
        ]"
      >
        <div class="flex items-center justify-between px-4 py-2">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-quicksand font-semibold transition-colors"
            :class="effectiveDark ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-800 hover:bg-gray-200'"
            @click="goBack"
          >
            <Icon name="ri:arrow-left-line" size="18" />
            Back
          </button>
          <h1
            :class="[
              'text-base font-semibold font-quicksand truncate px-2',
              effectiveDark ? 'text-white' : 'text-gray-900'
            ]"
          >
            Open Source
          </h1>
          <span class="w-16 shrink-0" aria-hidden="true" />
        </div>
      </div>
    </header>

    <!-- App header (dashboard / default — desktop & web) -->
    <header v-else>
      <div
        :class="[
          'fixed top-0 left-0 right-0 z-50 transition-colors duration-300',
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
        'px-4 sm:px-6 lg:px-8',
        isFromLanding
          ? 'relative z-10 pt-32 pb-16'
          : isIos
            ? 'pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))]'
            : 'pt-24 pb-16'
      ]"
    >
      <div :class="['max-w-4xl mx-auto', isFromLanding ? 'relative overflow-hidden rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_0_42px_-12px_rgba(59,130,246,0.24),0_0_56px_-18px_rgba(37,99,235,0.14)] p-6 sm:p-8 lg:px-10 lg:pt-10 lg:pb-8' : '']">
        <!-- Hero Section -->
        <div :class="['text-center', isAppShell && isIos ? 'mb-8' : 'mb-12']">
          <div
            :class="[
              'inline-flex items-center justify-center rounded-2xl shadow-lg',
              isAppShell && isIos ? 'w-14 h-14 mb-4' : 'w-16 h-16 mb-6',
              isFromLanding ? 'bg-blue-600 shadow-[0_0_24px_-2px_rgba(37,99,235,0.55)]' : 'bg-blue-600 shadow-blue-900/20'
            ]"
          >
            <Icon name="ri:open-source-line" :size="isAppShell && isIos ? 28 : 32" class="text-white" />
          </div>
          <h1
            v-if="!(isAppShell && isIos)"
            :class="[
              'font-bold font-quicksand mb-4',
              isFromLanding ? 'text-4xl text-gray-950 dark:text-gray-900 drop-shadow-sm' : ['text-4xl', effectiveDark ? 'text-white' : 'text-gray-900']
            ]"
          >
            Open Source
          </h1>
          <p
            :class="[
              'max-w-2xl mx-auto',
              isFromLanding ? 'text-lg text-gray-800 dark:text-gray-700 font-medium' : ['text-lg', effectiveDark ? 'text-gray-400' : 'text-gray-600']
            ]"
          >
            Logifi-Core is open source. View the repo, report issues, or contribute.
          </p>
        </div>

        <!-- Links Grid -->
        <div class="grid gap-6 md:grid-cols-2 mb-12 auto-rows-min">
          <!-- GitHub -->
          <a
            href="https://github.com/Logifi-LLC/Logifi-Core"
            target="_blank"
            rel="noopener noreferrer"
            :class="[
              'flex items-start gap-4 p-6 rounded-3xl border transition-all duration-200 hover:scale-[1.02]',
              isFromLanding ? 'bg-white/10 backdrop-blur-md border-white/15 hover:border-white/25 shadow-[0_0_32px_-10px_rgba(59,130,246,0.28)] dark:bg-white/10 dark:border-white/15 dark:hover:border-white/25' : (effectiveDark 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)]' 
                : 'bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)]')
            ]"
          >
            <div :class="['flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', isFromLanding ? 'bg-white/50 dark:bg-white/50' : (effectiveDark ? 'bg-gray-700' : 'bg-gray-200')]">
              <Icon name="ri:github-fill" size="24" :class="isFromLanding ? 'text-gray-900' : (effectiveDark ? 'text-white' : 'text-gray-900')" />
            </div>
            <div>
              <h3 :class="['font-semibold font-quicksand mb-1', isFromLanding ? 'text-gray-950 dark:text-gray-900' : (effectiveDark ? 'text-white' : 'text-gray-900')]">
                GitHub Repository
              </h3>
              <p :class="['text-sm', isFromLanding ? 'text-gray-800 dark:text-gray-800' : (effectiveDark ? 'text-gray-400' : 'text-gray-600')]">
                View source code, report issues, and submit pull requests.
              </p>
            </div>
            <Icon name="ri:external-link-line" size="18" :class="['flex-shrink-0 mt-1', isFromLanding ? 'text-gray-600 dark:text-gray-600' : (effectiveDark ? 'text-gray-500' : 'text-gray-400')]" />
          </a>

          <!-- Contributing -->
          <a
            href="https://github.com/Logifi-LLC/Logifi-Core/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noopener noreferrer"
            :class="[
              'flex items-start gap-4 p-6 rounded-3xl border transition-all duration-200 hover:scale-[1.02]',
              isFromLanding ? 'bg-white/10 backdrop-blur-md border-white/15 hover:border-white/25 shadow-[0_0_32px_-10px_rgba(59,130,246,0.28)] dark:bg-white/10 dark:border-white/15 dark:hover:border-white/25' : (effectiveDark 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)]' 
                : 'bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)]')
            ]"
          >
            <div :class="['flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', isFromLanding ? 'bg-green-100/50 dark:bg-green-100/50' : (effectiveDark ? 'bg-green-900/50' : 'bg-green-100')]">
              <Icon name="ri:git-pull-request-line" size="24" :class="isFromLanding ? 'text-green-700 dark:text-green-700' : (effectiveDark ? 'text-green-400' : 'text-green-600')" />
            </div>
            <div>
              <h3 :class="['font-semibold font-quicksand mb-1', isFromLanding ? 'text-gray-950 dark:text-gray-900' : (effectiveDark ? 'text-white' : 'text-gray-900')]">
                Contributing Guide
              </h3>
              <p :class="['text-sm', isFromLanding ? 'text-gray-800 dark:text-gray-800' : (effectiveDark ? 'text-gray-400' : 'text-gray-600')]">
                Learn how to contribute to the project and what we accept.
              </p>
            </div>
            <Icon name="ri:external-link-line" size="18" :class="['flex-shrink-0 mt-1', isFromLanding ? 'text-gray-600 dark:text-gray-600' : (effectiveDark ? 'text-gray-500' : 'text-gray-400')]" />
          </a>

          <!-- License -->
          <a
            href="https://github.com/Logifi-LLC/Logifi-Core/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            :class="[
              'flex items-start gap-4 p-6 rounded-3xl border transition-all duration-200 hover:scale-[1.02]',
              isFromLanding ? 'bg-white/10 backdrop-blur-md border-white/15 hover:border-white/25 shadow-[0_0_32px_-10px_rgba(59,130,246,0.28)] dark:bg-white/10 dark:border-white/15 dark:hover:border-white/25' : (effectiveDark 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)]' 
                : 'bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)]')
            ]"
          >
            <div :class="['flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', isFromLanding ? 'bg-purple-100/50 dark:bg-purple-100/50' : (effectiveDark ? 'bg-purple-900/50' : 'bg-purple-100')]">
              <Icon name="ri:scales-3-line" size="24" :class="isFromLanding ? 'text-purple-700 dark:text-purple-700' : (effectiveDark ? 'text-purple-400' : 'text-purple-600')" />
            </div>
            <div>
              <h3 :class="['font-semibold font-quicksand mb-1', isFromLanding ? 'text-gray-950 dark:text-gray-900' : (effectiveDark ? 'text-white' : 'text-gray-900')]">
                License
              </h3>
              <p :class="['text-sm', isFromLanding ? 'text-gray-800 dark:text-gray-800' : (effectiveDark ? 'text-gray-400' : 'text-gray-600')]">
                Apache 2.0 License - free to use, modify, and distribute.
              </p>
            </div>
            <Icon name="ri:external-link-line" size="18" :class="['flex-shrink-0 mt-1', isFromLanding ? 'text-gray-600 dark:text-gray-600' : (effectiveDark ? 'text-gray-500' : 'text-gray-400')]" />
          </a>

          <!-- Code of Conduct -->
          <a
            href="https://github.com/Logifi-LLC/Logifi-Core/blob/main/CODE_OF_CONDUCT.md"
            target="_blank"
            rel="noopener noreferrer"
            :class="[
              'flex items-start gap-4 p-6 rounded-3xl border transition-all duration-200 hover:scale-[1.02]',
              isFromLanding ? 'bg-white/10 backdrop-blur-md border-white/15 hover:border-white/25 shadow-[0_0_32px_-10px_rgba(59,130,246,0.28)] dark:bg-white/10 dark:border-white/15 dark:hover:border-white/25' : (effectiveDark 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)]' 
                : 'bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)]')
            ]"
          >
            <div :class="['flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', isFromLanding ? 'bg-orange-100/50 dark:bg-orange-100/50' : (effectiveDark ? 'bg-orange-900/50' : 'bg-orange-100')]">
              <Icon name="ri:heart-line" size="24" :class="isFromLanding ? 'text-orange-700 dark:text-orange-700' : (effectiveDark ? 'text-orange-400' : 'text-orange-600')" />
            </div>
            <div>
              <h3 :class="['font-semibold font-quicksand mb-1', isFromLanding ? 'text-gray-950 dark:text-gray-900' : (effectiveDark ? 'text-white' : 'text-gray-900')]">
                Code of Conduct
              </h3>
              <p :class="['text-sm', isFromLanding ? 'text-gray-800 dark:text-gray-800' : (effectiveDark ? 'text-gray-400' : 'text-gray-600')]">
                Our community guidelines for a welcoming environment.
              </p>
            </div>
            <Icon name="ri:external-link-line" size="18" :class="['flex-shrink-0 mt-1', isFromLanding ? 'text-gray-600 dark:text-gray-600' : (effectiveDark ? 'text-gray-500' : 'text-gray-400')]" />
          </a>

          <!-- ICLA -->
          <a
            href="/images/ICLA.pdf"
            target="_blank"
            rel="noopener noreferrer"
            :class="[
              'flex items-start gap-4 p-6 rounded-3xl border transition-all duration-200 hover:scale-[1.02]',
              isFromLanding ? 'bg-white/10 backdrop-blur-md border-white/15 hover:border-white/25 shadow-[0_0_32px_-10px_rgba(59,130,246,0.28)] dark:bg-white/10 dark:border-white/15 dark:hover:border-white/25' : (effectiveDark 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)]' 
                : 'bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)]')
            ]"
          >
            <div :class="['flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', isFromLanding ? 'bg-blue-100/50 dark:bg-blue-100/50' : (effectiveDark ? 'bg-blue-900/50' : 'bg-blue-100')]">
              <Icon name="ri:file-pdf-2-line" size="24" :class="isFromLanding ? 'text-blue-700 dark:text-blue-700' : (effectiveDark ? 'text-blue-400' : 'text-blue-600')" />
            </div>
            <div>
              <h3 :class="['font-semibold font-quicksand mb-1', isFromLanding ? 'text-gray-950 dark:text-gray-900' : (effectiveDark ? 'text-white' : 'text-gray-900')]">
                Contributor License Agreement
              </h3>
              <p :class="['text-sm', isFromLanding ? 'text-gray-800 dark:text-gray-800' : (effectiveDark ? 'text-gray-400' : 'text-gray-600')]">
                Review and sign the CLA to contribute.
              </p>
            </div>
            <Icon name="ri:external-link-line" size="18" :class="['flex-shrink-0 mt-1', isFromLanding ? 'text-gray-600 dark:text-gray-600' : (effectiveDark ? 'text-gray-500' : 'text-gray-400')]" />
          </a>

        </div>

        <!-- Tech Stack -->
        <div :class="['rounded-2xl border p-8', isFromLanding ? 'bg-white/10 backdrop-blur-md border-white/15 shadow-[0_0_32px_-10px_rgba(59,130,246,0.28)] dark:bg-white/10 dark:border-white/15' : (effectiveDark ? 'bg-gray-800 border-gray-700 text-gray-200 shadow-sm' : 'bg-gray-100 border-gray-300 text-gray-800 shadow-sm')]">
          <h2 :class="['text-xl font-semibold font-quicksand mb-6', isFromLanding ? 'text-gray-950 dark:text-gray-900' : (effectiveDark ? 'text-white' : 'text-gray-900')]">
            Built With
          </h2>
          <div class="flex flex-wrap gap-3">
            <span
              v-for="tech in ['Nuxt 4', 'Vue 3', 'TypeScript', 'Tailwind CSS']"
              :key="tech"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-quicksand font-medium',
                isFromLanding ? 'bg-white/60 text-gray-900 border border-white/30 dark:bg-white/60 dark:text-gray-900' : (effectiveDark ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700 border border-gray-200')
              ]"
            >
              {{ tech }}
            </span>
          </div>
        </div>

        <!-- Footer -->
        <div v-if="!isFromLanding" class="mt-12 text-center">
          <p :class="['text-sm', effectiveDark ? 'text-gray-500' : 'text-gray-500']">
            Made with ❤️ by the aviation community
          </p>
        </div>
      </div>
    </main>

    <MarketingFooter v-if="isFromLanding" active-page="developers" class="mt-12" />

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
import MarketingFooter from '~/components/MarketingFooter.vue'
import MarketingHeader from '~/components/MarketingHeader.vue'
import TechnicalTopographyBg from '~/components/TechnicalTopographyBg.vue'
import { useCapacitorPlatform } from '~/composables/useCapacitorPlatform'

const route = useRoute()
const router = useRouter()
const { isIos } = useCapacitorPlatform()

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
  return '/dashboard' // default
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

const { theme, isDark, applyDocumentTheme } = useTheme()
/** `?from=landing` uses marketing shell; app chrome uses theme. */
const isFromLanding = computed(() => route.query.from === 'landing')
const isAppShell = computed(() => !isFromLanding.value)
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
