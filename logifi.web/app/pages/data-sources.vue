<template>
  <div
    class="min-h-screen bg-gray-100 font-quicksand text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100"
  >
    <header
      class="fixed top-0 left-0 right-0 z-50 border-b bg-white/80 backdrop-blur-md border-gray-100 transition-colors dark:border-gray-800 dark:bg-gray-900/90 dark:backdrop-blur-md"
    >
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

    <main class="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto prose prose-gray">
        <h1 class="text-3xl font-bold font-quicksand text-gray-900 mb-2 dark:text-white">
          Data sources &amp; third-party APIs
        </h1>
        <p class="text-gray-600 mb-8 dark:text-gray-400">
          How Logifi uses external services, including the Flight Crew View Logbook API.
        </p>

        <FcvApiDisclaimers class="not-prose mb-10" tone="marketing" />

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3 dark:text-white">Flight Crew View</h2>
          <p
            v-if="showPill"
            class="not-prose text-sm text-gray-600 mb-3 dark:text-gray-400"
          >
            {{ subcopy }}
          </p>
          <p class="text-gray-700 leading-relaxed mb-3 dark:text-gray-300">
            If you choose to connect Flight Crew View, you complete OAuth on FC View’s side. Our
            <strong>server</strong> exchanges the authorization code for access and refresh tokens and
            stores them in our database associated with your Logifi user account. The browser does not
            receive FC View tokens. We use those tokens only to request your flight history for
            logbook import, in line with FC View’s partner policy (logbook workflows only).
          </p>
          <p class="text-gray-700 leading-relaxed mb-3 dark:text-gray-300">
            We do not collect or store your FC View password or passkey. We do not send FC View
            tokens or authorization codes to AI or LLM providers.
          </p>
          <p class="text-gray-700 leading-relaxed mb-4 dark:text-gray-300">
            To remove imported flights, use Logifi’s logbook tools. To revoke the FC View connection
            and delete stored tokens, you can disconnect your account below.
          </p>

          <div
            v-if="isAuthenticated"
            class="not-prose bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-900 dark:shadow-lg dark:shadow-black/20"
          >
            <h3 class="text-base font-semibold text-gray-900 mb-1 dark:text-white">Manage Connection</h3>
            <p class="text-sm text-gray-600 mb-4 dark:text-gray-400">
              Disconnecting will immediately delete your FC View access and refresh tokens from our servers. You will need to reconnect to import future flights.
            </p>
            <div class="flex items-center gap-3">
              <button
                type="button"
                @click="disconnectFcv"
                :disabled="isDisconnecting"
                class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-red-800/70 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <Icon name="ri:plug-disconnect-line" size="16" />
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
            class="not-prose bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600 transition-colors dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400"
          >
            Sign in to manage your Flight Crew View connection.
          </div>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3 dark:text-white">Other services</h2>
          <p class="text-gray-700 leading-relaxed dark:text-gray-300">
            Authentication and primary database storage use Supabase. Hosting and analytics may use
            Vercel. See our
            <NuxtLink to="/privacy" class="text-blue-600 hover:underline dark:text-blue-400">
              Privacy Policy
            </NuxtLink>
            for details.
          </p>
        </section>

        <div
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from '#imports'
import { useAuth } from '~/composables/useAuth'
import { useFcvUiLabel } from '~/composables/useFcvUiLabel'
import FcvApiDisclaimers from '~/components/fcv/FcvApiDisclaimers.vue'

const route = useRoute()
const router = useRouter()
const { isAuthenticated, session } = useAuth()
const { showPill, subcopy } = useFcvUiLabel()

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
