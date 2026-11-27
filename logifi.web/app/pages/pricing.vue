<template>
  <MarketingSecondaryPageShell>
    <MarketingHeader active-page="pricing" @open-auth="openAuth" />

    <main class="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold text-gray-100 mb-4">Pricing</h1>
      <p class="text-gray-400 mb-8 text-lg font-medium">
        Logifi is free. Autofi (FLICA) is in public beta and included. See
        <NuxtLink to="/integrations" class="text-blue-400 hover:text-blue-300 transition-colors">Integrations</NuxtLink>
        for details. Digifi scanning uses credits per page (below).
      </p>

      <div
        class="relative overflow-hidden rounded-xl border border-gray-800/50 bg-gray-900/40 backdrop-blur-sm shadow-lg p-6 sm:p-8 lg:px-10 lg:pt-10 lg:pb-8 space-y-8"
      >
        <div>
          <p class="text-sm font-bold uppercase tracking-wide text-blue-400">Logifi</p>
          <p class="mt-2 text-5xl font-bold text-gray-100">$0</p>
          <p class="text-gray-300 mt-2 text-lg">No charge for the core logbook.</p>
          <button
            type="button"
            class="btn-cta-primary mt-6 min-h-11 w-full sm:w-auto px-6 py-3 bg-blue-600 text-white text-base font-bold rounded-lg hover:bg-blue-700 transition-all border border-blue-500/50 active:scale-[0.98]"
            @click="openAuth('signup')"
          >
            <span class="relative z-10">Start free</span>
          </button>
        </div>

        <div class="border-t border-gray-800/50 pt-8">
          <p class="text-sm font-bold uppercase tracking-wide text-blue-400">Digifi Credits</p>
          <p class="text-gray-300 mt-2 text-lg leading-relaxed">
            Every account starts with <strong class="text-gray-100">{{ welcomeCredits }} free Digifi pages</strong>.
            Scan a few pages, review and import them, and Digifi learns your logbook over the free pages. Re-scanning a page that was already charged is free.
            <NuxtLink to="/how-to-digitize-a-paper-pilot-logbook" class="mt-2 block text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors">
              How to digitize a paper logbook
            </NuxtLink>
          </p>
          <p class="text-gray-300 mt-4 text-lg leading-relaxed">
            <strong class="text-gray-100">1 credit = 1 logbook page</strong> (the left and right sides of the paper book).
            Additional pages are ${{ stripeRateDollars.toFixed(2) }} each by card after the free pages.
            More detail is in <NuxtLink to="/faq" class="font-bold text-blue-400 hover:text-blue-300 transition-colors">the FAQ</NuxtLink>.
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
import { MARKETING_SHELL_SEO } from '../../shared/publicSeo'

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

const pricingSeo = MARKETING_SHELL_SEO['/pricing']
useHead({
  title: pricingSeo.title,
  meta: [{ name: 'description', content: pricingSeo.description }],
})
</script>
