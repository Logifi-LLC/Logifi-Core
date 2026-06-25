<template>
  <MarketingSecondaryPageShell>
    <MarketingHeader active-page="pricing" @open-auth="openAuth" />

    <main class="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold text-gray-950 mb-4 drop-shadow-sm dark:text-gray-900">Pricing</h1>
      <p class="text-gray-800 mb-8 text-lg font-medium dark:text-gray-700">
        Logifi is free. FC View integration requires a separate Flight Crew View
        subscription—see
        <NuxtLink to="/integrations" class="text-blue-600 hover:underline dark:text-blue-600">Integrations</NuxtLink>
        for details. Digifi scanning uses pay-per-spread credits (below).
      </p>

      <div
        class="relative overflow-hidden rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_0_42px_-12px_rgba(59,130,246,0.24),0_0_56px_-18px_rgba(37,99,235,0.14)] p-6 sm:p-8 lg:px-10 lg:pt-10 lg:pb-8 space-y-8"
      >
        <div>
          <p class="text-sm font-bold uppercase tracking-wide text-blue-600 dark:text-blue-600">Logifi</p>
          <p class="mt-2 text-5xl font-bold text-gray-950 dark:text-gray-900">$0</p>
          <p class="text-gray-800 mt-2 text-lg dark:text-gray-800">No charge for the core logbook.</p>
        </div>

        <div class="border-t border-white/20 pt-8 dark:border-white/20">
          <p class="text-sm font-bold uppercase tracking-wide text-blue-600 dark:text-blue-600">Digifi Credits</p>
          <p class="text-gray-800 mt-2 text-lg leading-relaxed dark:text-gray-800">
            Every account starts with <strong class="text-gray-950 dark:text-gray-900">{{ welcomeCredits }} free Digifi spreads</strong>
            (about {{ welcomeCredits * 2 }} logbook pages). Scan a few spreads, review and import them, and Digifi starts learning your aircraft and handwriting. Re-scanning the same spread is always free.
          </p>
          <p class="text-gray-800 mt-4 text-lg leading-relaxed dark:text-gray-800">
            <strong class="text-gray-950 dark:text-gray-900">1 credit = 1 logbook spread</strong> (left + right pages).
          </p>
          <ul class="mt-4 space-y-3 text-lg text-gray-800 dark:text-gray-800">
            <li>
              <strong class="text-gray-950 dark:text-gray-900">Credit Card:</strong>
              ${{ stripeRateDollars.toFixed(2) }} per credit (minimum {{ stripeMinCredits }} credits)
            </li>
            <li>
              <strong class="text-gray-950 dark:text-gray-900">Bitcoin Lightning:</strong>
              ${{ lightningRateDollars.toFixed(2) }} per credit (minimum {{ lightningMinCredits }} credit)
            </li>
          </ul>
        </div>

        <p class="text-lg text-gray-800 leading-relaxed dark:text-gray-800 border-t border-white/20 pt-8 dark:border-white/20">
          If we add paid plans later, we’ll show price, billing, renewals, trials, how to cancel, and
          refunds before you pay—same idea as in our
          <NuxtLink to="/terms?from=landing" class="text-blue-600 font-bold hover:underline dark:text-blue-600">Terms</NuxtLink>.
        </p>

        <FcvApiDisclaimers class="mt-4" tone="marketing" />
      </div>
    </main>

    <MarketingFooter active-page="pricing" class="mt-12" />

    <ClientOnly>
      <AuthModal
        v-if="showAuth"
        :initial-tab="authTab"
        @close="showAuth = false"
        @success="handleAuthSuccess"
      />
    </ClientOnly>
  </MarketingSecondaryPageShell>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount, watch } from 'vue'
import FcvApiDisclaimers from '~/components/fcv/FcvApiDisclaimers.vue'
import AuthModal from '~/components/AuthModal.vue'
import MarketingFooter from '~/components/MarketingFooter.vue'
import MarketingHeader from '~/components/MarketingHeader.vue'
import MarketingSecondaryPageShell from '~/components/MarketingSecondaryPageShell.vue'
import {
  rateDollarsForMethod,
  minPagesForMethod,
} from '~/utils/creditsPricing'
import { WELCOME_CREDITS } from '../../shared/creditsWelcome'

const welcomeCredits = WELCOME_CREDITS

const stripeRateDollars = rateDollarsForMethod('stripe')
const lightningRateDollars = rateDollarsForMethod('lightning')
const stripeMinCredits = minPagesForMethod('stripe')
const lightningMinCredits = minPagesForMethod('lightning')

const { theme, applyDocumentTheme } = useTheme()

/** Marketing shell stays light (matches home); restore saved theme when leaving. */
if (import.meta.client) {
  applyDocumentTheme('light')
  onBeforeUnmount(() => {
    applyDocumentTheme(theme.value)
  })
  watch(theme, () => {
    applyDocumentTheme('light')
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

useHead({
  title: 'Pricing | Logifi',
  meta: [
    {
      name: 'description',
      content:
        'Logifi is free. Every account includes 10 free Digifi spreads. Additional scanning uses pay-per-spread credits ($0.30–$0.40). FC View sold separately.',
    },
  ],
})
</script>
