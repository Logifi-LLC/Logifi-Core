<template>
  <div
    :class="[
      'min-h-screen transition-colors duration-300 font-quicksand',
      isFromLanding
        ? 'relative overflow-x-hidden bg-[#e4e8e7] text-gray-900'
        : [
            'bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-gray-100',
            isIos ? 'overflow-x-hidden' : '',
          ],
    ]"
  >
    <TechnicalTopographyBg v-if="isFromLanding" />
    <div :class="isFromLanding ? 'relative z-10' : 'contents'">
    <MarketingHeader v-if="isFromLanding" active-page="data-sources" @open-auth="openAuth" />

    <!-- App header (dashboard / default) -->
    <header
      v-else
      :class="[
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/10 bg-white/5 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90',
        isIos ? 'pt-[env(safe-area-inset-top)]' : '',
      ]"
    >
      <div
        :class="[
          'max-w-7xl mx-auto flex items-center justify-between',
          isIos ? 'px-3 h-14' : 'px-4 sm:px-6 lg:px-8 h-20',
        ]"
      >
        <NuxtLink
          to="/"
          class="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors dark:text-gray-300 dark:hover:text-white min-w-0"
        >
          <img
            src="/images/logifi-logo.png"
            alt="Logifi"
            :class="[
              'w-auto brightness-0 dark:invert',
              isIos ? 'h-8' : 'h-32',
            ]"
          />
        </NuxtLink>
        <button
          type="button"
          :class="[
            'inline-flex items-center gap-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800 shrink-0',
            isIos ? 'px-2.5 py-1.5' : 'px-4 py-2',
          ]"
          @click="goBack"
        >
          <Icon name="ri:arrow-left-line" size="18" />
          <span>{{ isIos ? 'Back' : backLabel }}</span>
        </button>
      </div>
    </header>

    <main
      :class="[
        isFromLanding ? 'pt-32 pb-16 px-4 sm:px-6 lg:px-8' : '',
        !isFromLanding && isIos ? 'pt-[calc(3.5rem+env(safe-area-inset-top))] pb-16 px-3' : '',
        !isFromLanding && !isIos ? 'pt-24 pb-16 px-4 sm:px-6 lg:px-8' : '',
      ]"
    >
      <div
        :class="[
          'max-w-4xl mx-auto prose prose-gray',
          isIos && !isFromLanding ? 'break-words overflow-x-hidden max-w-full' : '',
          isFromLanding
            ? 'relative overflow-hidden rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_0_42px_-12px_rgba(59,130,246,0.24),0_0_56px_-18px_rgba(37,99,235,0.14)] p-6 sm:p-8 lg:px-10 lg:pt-10 lg:pb-8'
            : '',
        ]"
      >
        <h1
          :class="[
            'font-bold font-quicksand mb-2',
            isIos && !isFromLanding ? 'text-2xl' : 'text-3xl',
            isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white',
          ]"
        >
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
            <div :class="['flex gap-3', isIos ? 'flex-col items-stretch' : 'items-center']">
              <button
                type="button"
                @click="disconnectFcv"
                :disabled="isDisconnecting"
                :class="[
                  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-red-800/70 dark:text-red-400 dark:hover:bg-red-950/40',
                  isIos ? 'w-full' : '',
                ]"
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

    <MarketingFooter v-if="isFromLanding" active-page="data-sources" class="mt-12" />

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
import { useCapacitorPlatform } from '~/composables/useCapacitorPlatform'
import FcvApiDisclaimers from '~/components/fcv/FcvApiDisclaimers.vue'
import AuthModal from '~/components/AuthModal.vue'
import MarketingFooter from '~/components/MarketingFooter.vue'
import MarketingHeader from '~/components/MarketingHeader.vue'
import TechnicalTopographyBg from '~/components/TechnicalTopographyBg.vue'

const route = useRoute()
const router = useRouter()
const { isAuthenticated, session } = useAuth()
const { theme, applyDocumentTheme } = useTheme()
const { isIos } = useCapacitorPlatform()

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
