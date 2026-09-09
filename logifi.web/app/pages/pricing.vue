<template>
  <MarketingSecondaryPageShell>
    <MarketingHeader active-page="pricing" @open-auth="openAuth" />

    <main class="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold text-gray-100 mb-4">Pricing</h1>
      <p class="text-gray-400 mb-8 text-lg font-medium">
        Logifi is free. Autofi (FLICA) is in public beta with Republic (RJET) and included—see
        <NuxtLink to="/integrations" class="text-blue-400 hover:text-blue-300 transition-colors">Integrations</NuxtLink>
        for details. Digifi scanning uses pay-per-spread credits (below).
      </p>

      <div
        class="relative overflow-hidden rounded-xl border border-gray-800/50 bg-gray-900/40 backdrop-blur-sm shadow-lg p-6 sm:p-8 lg:px-10 lg:pt-10 lg:pb-8 space-y-8"
      >
        <div>
          <p class="text-sm font-bold uppercase tracking-wide text-blue-400">Logifi</p>
          <p class="mt-2 text-5xl font-bold text-gray-100">$0</p>
          <p class="text-gray-300 mt-2 text-lg">No charge for the core logbook.</p>
        </div>

        <div class="border-t border-gray-800/50 pt-8">
          <p class="text-sm font-bold uppercase tracking-wide text-blue-400">Digifi Credits</p>
          <p class="text-gray-300 mt-2 text-lg leading-relaxed">
            Every account starts with <strong class="text-gray-100">{{ welcomeCredits }} free Digifi spreads</strong>.
            Scan a few spreads, review and import them, and Digifi starts learning your aircraft and handwriting. Re-scanning the same spread is always free.
          </p>
          <p class="text-gray-300 mt-4 text-lg leading-relaxed">
            <strong class="text-gray-100">1 credit = 1 logbook spread</strong> (left + right pages).
          </p>
          <ul class="mt-4 space-y-3 text-lg text-gray-300">
            <li>
              <strong class="text-gray-100">Credit Card:</strong>
              ${{ stripeRateDollars.toFixed(2) }} per credit (minimum {{ stripeMinCredits }} credits)
            </li>
            <li>
              <strong class="text-gray-100">Bitcoin Lightning:</strong>
              ${{ lightningRateDollars.toFixed(2) }} per credit (minimum {{ lightningMinCredits }} credit)
            </li>
          </ul>
        </div>

        <p class="text-lg text-gray-300 leading-relaxed border-t border-gray-800/50 pt-8">
          If we add paid plans later, we'll show price, billing, renewals, trials, how to cancel, and
          refunds before you pay—same idea as in our
          <NuxtLink to="/terms?from=landing" class="text-blue-400 font-bold hover:text-blue-300 transition-colors">Terms</NuxtLink>.
        </p>
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

const { theme, isDark, applyDocumentTheme } = useTheme()

/** Marketing pages stay dark (cockpit aesthetic); restore saved theme when leaving. */
if (import.meta.client) {
  applyDocumentTheme('light')
  onBeforeUnmount(() => {
    applyDocumentTheme(theme.value)
  })
  watch([theme, isDark], () => {
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
        'Logifi is free. Every account includes 10 free Digifi spreads. Additional scanning uses pay-per-spread credits ($0.40–$0.50).',
    },
  ],
})
</script>
