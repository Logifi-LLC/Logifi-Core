<template>
  <div
    :class="[
      'min-h-screen transition-colors duration-300 font-quicksand',
      isFromLanding
        ? 'relative overflow-x-hidden bg-[#e4e8e7] text-gray-900'
        : 'bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-gray-100'
    ]"
  >
    <TechnicalTopographyBg v-if="isFromLanding" />
    <div :class="isFromLanding ? 'relative z-10' : 'contents'">
    <!-- Marketing header (?from=landing) -->
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
          <NuxtLink to="/feedback?from=landing" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Feedback</NuxtLink>
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

    <!-- App header (dashboard / default) -->
    <header v-else class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/10 bg-white/5 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <NuxtLink
          to="/"
          class="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors dark:text-gray-300 dark:hover:text-white"
        >
          <img
            src="/images/logifi-logo.png"
            alt="Logifi"
            class="h-32 w-auto brightness-0 dark:invert"
          />
        </NuxtLink>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
          @click="goBack"
        >
          <Icon name="ri:arrow-left-line" size="18" />
          {{ backLabel }}
        </button>
      </div>
    </header>

    <main :class="['pb-16 px-4 sm:px-6 lg:px-8', isFromLanding ? 'pt-32' : 'pt-24']">
      <div
        :class="[
          'max-w-4xl mx-auto prose prose-gray',
          isFromLanding
            ? 'relative overflow-hidden rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_0_42px_-12px_rgba(59,130,246,0.24),0_0_56px_-18px_rgba(37,99,235,0.14)] p-6 sm:p-8 lg:px-10 lg:pt-10 lg:pb-8'
            : '',
        ]"
      >
        <h1 :class="['text-3xl font-bold font-quicksand mb-2', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">
          Data sources &amp; third-party APIs
        </h1>
        <p :class="['mb-8', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-600 dark:text-gray-400']">
          How Logifi uses external services, including the Flight Crew View Logbook API.
        </p>

        <FcvApiDisclaimers class="not-prose mb-10" tone="marketing" />

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">Flight Crew View</h2>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            If you choose to connect Flight Crew View, you complete OAuth on FC View’s side. Our
            <strong :class="isFromLanding ? 'text-gray-950 dark:text-gray-900' : ''">server</strong> exchanges the authorization code for access and refresh tokens and
            stores them in our database associated with your Logifi user account. The browser does not
            receive FC View tokens. We use those tokens only to request your flight history for
            logbook import, in line with FC View’s partner policy (logbook workflows only).
          </p>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            We do not collect or store your FC View password or passkey. We do not send FC View
            tokens or authorization codes to AI or LLM providers.
          </p>
          <p :class="['leading-relaxed mb-4', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            To remove imported flights, use Logifi’s logbook tools. To revoke the FC View connection
            and delete stored tokens, you can disconnect your account below.
          </p>

          <div
            v-if="isAuthenticated"
            :class="['not-prose border rounded-xl p-4 sm:p-6 shadow-sm transition-colors', isFromLanding ? 'bg-white/40 border-white/20 dark:bg-white/40 dark:border-white/20' : 'bg-white border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:shadow-lg dark:shadow-black/20']"
          >
            <h3 :class="['text-base font-semibold mb-1', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">Manage Connection</h3>
            <p :class="['text-sm mb-4', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-600 dark:text-gray-400']">
              Disconnecting will immediately delete your FC View access and refresh tokens from our servers. You will need to reconnect to import future flights.
            </p>
            <div class="flex items-center gap-3">
              <button
                type="button"
                @click="disconnectFcv"
                :disabled="isDisconnecting"
                class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-red-800/70 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <Icon name="ri:link-unlink" size="16" />
                {{ isDisconnecting ? 'Disconnecting...' : 'Disconnect FC View' }}
              </button>
              <span
                v-if="disconnectMessage"
                :class="[
                  'text-sm',
                  disconnectError ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
                ]"
              >
                {{ disconnectMessage }}
              </span>
            </div>
          </div>
          <div
            v-else
            :class="['not-prose border rounded-xl p-4 text-sm transition-colors', isFromLanding ? 'bg-white/20 border-white/20 text-gray-800 dark:bg-white/20 dark:text-gray-800' : 'bg-gray-50 border-gray-200 text-gray-600 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400']"
          >
            Sign in to manage your Flight Crew View connection.
          </div>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">Digifi (paper logbook scanning)</h2>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            If you use <strong :class="isFromLanding ? 'text-gray-950 dark:text-gray-900' : ''">Digifi</strong> on Add Pages
            (<NuxtLink to="/logbook-builder" class="text-blue-600 hover:underline dark:text-blue-400">/logbook-builder</NuxtLink>),
            you upload photos of your paper logbook. Our server sends those images and extracted text to
            <strong :class="isFromLanding ? 'text-gray-950 dark:text-gray-900' : ''">Google Gemini</strong> to transcribe entries into the builder grid.
            You review and edit before importing into your digital logbook.
          </p>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            Scan images are stored in our private storage bucket for up to <strong :class="isFromLanding ? 'text-gray-950 dark:text-gray-900' : ''">24 hours</strong>
            (for support), then deleted. We do not send FC View tokens, authorization codes, or passkeys to Gemini or any other AI provider.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">Other services</h2>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            Authentication and primary database storage use Supabase. Hosting and analytics may use
            Vercel. See our
            <NuxtLink to="/privacy" class="text-blue-600 hover:underline dark:text-blue-400">
              Privacy Policy
            </NuxtLink>
            for details.
          </p>
        </section>

        <div
          v-if="!isFromLanding"
          class="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500 transition-colors dark:border-gray-800 dark:text-gray-500"
        >
          <NuxtLink to="/integrations" class="text-blue-600 hover:underline dark:text-blue-400">
            Integrations
          </NuxtLink>
          <span class="mx-2">·</span>
          <NuxtLink to="/terms" class="text-blue-600 hover:underline dark:text-blue-400">Terms</NuxtLink>
          <span class="mx-2">·</span>
          <NuxtLink to="/privacy" class="text-blue-600 hover:underline dark:text-blue-400">Privacy</NuxtLink>
        </div>
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
          <NuxtLink to="/data-sources?from=landing" class="text-blue-600 transition-colors dark:text-blue-600">Data sources</NuxtLink>
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
import { ref, computed, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from '#imports'
import { useAuth } from '~/composables/useAuth'
import FcvApiDisclaimers from '~/components/fcv/FcvApiDisclaimers.vue'
import AuthModal from '~/components/AuthModal.vue'
import TechnicalTopographyBg from '~/components/TechnicalTopographyBg.vue'

const route = useRoute()
const router = useRouter()
const { isAuthenticated, session } = useAuth()
const { theme, applyDocumentTheme } = useTheme()

const isFromLanding = computed(() => route.query.from === 'landing')

/** Marketing shell stays light (matches home); restore saved theme when leaving. */
if (import.meta.client) {
  watch(isFromLanding, (val) => {
    if (val) applyDocumentTheme('light')
    else applyDocumentTheme(theme.value)
  }, { immediate: true })

  onBeforeUnmount(() => {
    applyDocumentTheme(theme.value)
  })
  watch(theme, (newTheme) => {
    if (isFromLanding.value) applyDocumentTheme('light')
    else applyDocumentTheme(newTheme)
  })
}

const showAuth = ref(false)
const authTab = ref<'signin' | 'signup'>('signin')

const openAuth = (tab: 'signin' | 'signup') => {
  authTab.value = tab
  showAuth.value = true
}

const handleAuthSuccess = () => {
  window.location.href = '/dashboard'
}

const isDisconnecting = ref(false)
const disconnectMessage = ref('')
const disconnectError = ref(false)

const disconnectFcv = async () => {
  if (!isAuthenticated.value) return
  
  isDisconnecting.value = true
  disconnectMessage.value = ''
  disconnectError.value = false
  
  try {
    await $fetch('/api/fcv/disconnect', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.value?.access_token}`
      }
    })
    disconnectMessage.value = 'Successfully disconnected.'
  } catch (err) {
    disconnectError.value = true
    disconnectMessage.value = 'Failed to disconnect. Please try again or contact support.'
  } finally {
    isDisconnecting.value = false
  }
}

const backLabel = computed(() =>
  route.query.from === 'landing' ? 'Back to Home' : 'Back to Logbook'
)

const goBack = () => {
  const from = route.query.from
  if (from === 'landing') {
    router.push('/')
    return
  }
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
  } else {
    router.push('/dashboard')
  }
}

useHead({
  title: 'Data sources & third-party APIs | Logifi',
  meta: [
    {
      name: 'description',
      content: 'Third-party data sources used by Logifi, including Flight Crew View.',
    },
  ],
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
