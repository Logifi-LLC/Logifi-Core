<template>
  <div class="min-h-screen bg-gray-100 font-quicksand text-gray-900">
    <header class="fixed top-0 left-0 right-0 z-50 border-b bg-white/80 backdrop-blur-md border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <img src="/images/logifi-logo.png" alt="Logifi" class="h-32 w-auto brightness-0" />
        </NuxtLink>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          @click="goBack"
        >
          <Icon name="ri:arrow-left-line" size="18" />
          {{ backLabel }}
        </button>
      </div>
    </header>

    <main class="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto prose prose-gray">
        <h1 class="text-3xl font-bold font-quicksand text-gray-900 mb-2">Data sources &amp; third-party APIs</h1>
        <p class="text-gray-600 mb-8">
          How Logifi uses external services, including the Flight Crew View Logbook API.
        </p>

        <FcvApiDisclaimers class="not-prose mb-10" tone="marketing" />

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">Flight Crew View</h2>
          <p class="text-gray-700 leading-relaxed mb-3">
            If you choose to connect Flight Crew View, you complete OAuth on FC View’s side. Our
            <strong>server</strong> exchanges the authorization code for access and refresh tokens and
            stores them in our database associated with your Logifi user account. The browser does not
            receive FC View tokens. We use those tokens only to request your flight history for
            logbook import, in line with FC View’s partner policy (logbook workflows only).
          </p>
          <p class="text-gray-700 leading-relaxed mb-3">
            We do not collect or store your FC View password or passkey. We do not send FC View
            tokens or authorization codes to AI or LLM providers.
          </p>
          <p class="text-gray-700 leading-relaxed mb-4">
            To remove imported flights, use Logifi’s logbook tools. To revoke the FC View connection
            and delete stored tokens, you can disconnect your account below.
          </p>

          <div v-if="isAuthenticated" class="not-prose bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <h3 class="text-base font-semibold text-gray-900 mb-1">Manage Connection</h3>
            <p class="text-sm text-gray-600 mb-4">
              Disconnecting will immediately delete your FC View access and refresh tokens from our servers. You will need to reconnect to import future flights.
            </p>
            <div class="flex items-center gap-3">
              <button
                type="button"
                @click="disconnectFcv"
                :disabled="isDisconnecting"
                class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name="ri:plug-disconnect-line" size="16" />
                {{ isDisconnecting ? 'Disconnecting...' : 'Disconnect FC View' }}
              </button>
              <span v-if="disconnectMessage" :class="['text-sm', disconnectError ? 'text-red-600' : 'text-green-600']">
                {{ disconnectMessage }}
              </span>
            </div>
          </div>
          <div v-else class="not-prose bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
            Sign in to manage your Flight Crew View connection.
          </div>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">Other services</h2>
          <p class="text-gray-700 leading-relaxed">
            Authentication and primary database storage use Supabase. Hosting and analytics may use
            Vercel. See our
            <NuxtLink to="/privacy" class="text-blue-600 hover:underline">Privacy Policy</NuxtLink>
            for details.
          </p>
        </section>

        <div class="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <NuxtLink to="/integrations" class="text-blue-600 hover:underline">Integrations</NuxtLink>
          <span class="mx-2">·</span>
          <NuxtLink to="/terms" class="text-blue-600 hover:underline">Terms</NuxtLink>
          <span class="mx-2">·</span>
          <NuxtLink to="/privacy" class="text-blue-600 hover:underline">Privacy</NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from '#imports'
import { useAuth } from '~/composables/useAuth'
import FcvApiDisclaimers from '~/components/fcv/FcvApiDisclaimers.vue'

const route = useRoute()
const router = useRouter()
const { isAuthenticated, session } = useAuth()

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
