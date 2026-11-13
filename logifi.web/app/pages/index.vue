<template>
  <!-- Force light theme on landing: dark: overrides so links/header stay light even when app uses dark mode -->
  <div class="min-h-screen bg-[#0a0e1a] font-quicksand text-gray-100 overflow-x-hidden dark:bg-[#0a0e1a] dark:text-gray-100">
    <MarketingHeader active-page="home" :logo-href="null" @open-auth="openAuth" />

    <!-- Main content wrapper with relative positioning for absolute planes -->
    <div class="relative">
    <MarketingPaperPlanes />

    <!-- Hero Section -->
    <main>
      <section class="relative pt-32 pb-12 lg:pt-40 lg:pb-16 overflow-hidden">
        <!-- Subtle grid background pattern -->
        <div class="absolute inset-0 z-0 opacity-[0.03]" style="background-image: linear-gradient(rgba(59, 130, 246, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.4) 1px, transparent 1px); background-size: 40px 40px;"></div>
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div class="flex flex-col items-center gap-2 mb-6">
            <p
              id="landing-product-switcher-hint"
              class="text-xs font-medium text-gray-300"
            >
              See: <span class="text-gray-200">Logbook</span>
              <span aria-hidden="true"> · </span>
              <span class="text-gray-200">Digifi scanner</span>
            </p>
            <ProductSwitcher
              active-product="logifi"
              labelled-by="landing-product-switcher-hint"
            />
            <div class="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#12203a] border border-blue-800/40 text-[#93c5fd] text-xs font-semibold mt-1">
              Free · Open source
            </div>
          </div>
          
          <h1 class="text-5xl lg:text-7xl font-bold tracking-tight text-gray-100 mb-6 leading-[1.1]">
            The airline pilot <span class="text-[#93c5fd]">logbook.</span>
          </h1>
          
          <p class="max-w-2xl mx-auto text-xl text-gray-300 mb-4 leading-relaxed">
            Built for 121 CA and FO flying — pairings, legs, and hours that match the job.
          </p>
          <p class="max-w-2xl mx-auto text-base text-gray-300 mb-8 leading-relaxed">
            Built by a Republic captain who got tired of the alternatives.
          </p>
          
          <div class="flex w-full flex-col items-center gap-4">
            <div class="flex w-full max-w-lg flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center sm:justify-center">
              <button 
                type="button"
                @click="openAuth('signup')"
                class="btn-cta-primary min-h-11 w-full sm:w-auto px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-lg hover:bg-blue-700 transition-all border border-blue-500/50 active:scale-[0.98]"
              >
                <span class="relative z-10">Start your free logbook</span>
              </button>
              <AppStoreLink variant="hero" />
            </div>
            <p v-if="landingReferralCode" class="text-sm font-semibold text-[#93c5fd]">
              Referral code applied: {{ landingReferralCode }}
            </p>
          </div>

          <!-- TODO(derek): enable when MARKETING_HERO_SCREENSHOT_SRC is set — web + iPhone logbook screenshot -->
          <figure
            v-if="heroScreenshotSrc"
            class="mt-10 mx-auto max-w-5xl rounded-xl border border-gray-700/60 bg-[#141a28] p-3 sm:p-4"
          >
            <img
              :src="heroScreenshotSrc"
              alt="Logifi logbook on web and iPhone"
              class="w-full h-auto rounded-lg"
              width="1200"
              height="675"
            />
          </figure>
        </div>
      </section>

      <!-- How hours get in -->
      <section id="features" class="relative py-12 lg:py-16 overflow-hidden bg-[#0a0e1a]">
        <!-- Subtle diagonal lines pattern -->
        <div class="absolute inset-0 z-0 opacity-[0.02]" style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(59, 130, 246, 0.3) 35px, rgba(59, 130, 246, 0.3) 36px);"></div>
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div class="text-center mb-10">
            <h2 class="text-3xl sm:text-4xl font-bold text-gray-100 mb-3">How hours get in</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Autofi -->
            <div id="autofi-section" class="bg-[#141a28] p-8 rounded-xl border border-gray-800/50 hover:border-blue-800/50 transition-all flex flex-col">
              <div class="flex items-start gap-3 mb-4">
                <div class="w-10 h-10 bg-[#172554] rounded-lg flex items-center justify-center text-blue-400 flex-shrink-0">
                  <Icon name="ri:flight-takeoff-line" size="20" />
                </div>
                <div>
                  <h3 class="text-xl font-bold text-gray-100">Autofi</h3>
                  <AutofiBetaPill
                    tone="marketing"
                    label="Republic pilots only during beta"
                    class="mt-1"
                  />
                </div>
              </div>
              <p class="text-gray-300 leading-relaxed flex-1">
                Pulls your pairings into the book so you're not typing after a trip. Free while in beta.
              </p>
              <NuxtLink
                to="/integrations"
                class="mt-6 min-h-11 w-full inline-flex items-center justify-center px-4 py-3 text-sm font-bold text-gray-100 rounded-lg border border-gray-700 bg-gray-800/80 hover:bg-gray-700 hover:border-gray-600 transition-all active:scale-[0.98]"
              >
                See Autofi
              </NuxtLink>
            </div>

            <!-- Digifi -->
            <div class="bg-[#141a28] p-8 rounded-xl border border-gray-800/50 hover:border-blue-800/50 transition-all">
              <div class="w-10 h-10 bg-[#172554] rounded-lg flex items-center justify-center text-blue-400 mb-4">
                <Icon name="ri:scan-line" size="20" />
              </div>
              <h3 class="text-xl font-bold text-gray-100 mb-3">Digifi</h3>
              <p class="text-gray-300 leading-relaxed">
                Scan paper spreads into Logifi when you're coming off a paper book. Credits for scans.
              </p>
            </div>

            <!-- Import -->
            <div class="bg-[#141a28] p-8 rounded-xl border border-gray-800/50 hover:border-blue-800/50 transition-all">
              <div class="w-10 h-10 bg-[#172554] rounded-lg flex items-center justify-center text-blue-400 mb-4">
                <Icon name="ri:file-download-line" size="20" />
              </div>
              <h3 class="text-xl font-bold text-gray-100 mb-3">Import</h3>
              <p class="text-gray-300 leading-relaxed">
                Bring an existing digital logbook with you.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- The book -->
      <section class="relative py-12 lg:py-16 overflow-hidden">
        <!-- Grid pattern -->
        <div class="absolute inset-0 z-0 opacity-[0.03]" style="background-image: linear-gradient(rgba(59, 130, 246, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.4) 1px, transparent 1px); background-size: 40px 40px;"></div>

        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 class="text-3xl sm:text-4xl font-bold text-gray-100 mb-6">What the book is</h2>
          <p class="text-xl text-gray-300 leading-relaxed">
            One professional logbook for airline flying. Totals, history, export when you need it.
          </p>
          <button
            type="button"
            class="btn-cta-primary mt-10 min-h-11 w-full sm:w-auto px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-lg hover:bg-blue-700 transition-all border border-blue-500/50 active:scale-[0.98]"
            @click="openAuth('signup')"
          >
            <span class="relative z-10">Start your free logbook</span>
          </button>
        </div>
      </section>

      <MarketingFooter />
    </main>
    </div>
    <!-- End main content wrapper -->

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
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import AuthModal from '~/components/AuthModal.vue'
import AutofiBetaPill from '~/components/fcv/AutofiBetaPill.vue'
import MarketingFooter from '~/components/MarketingFooter.vue'
import MarketingHeader from '~/components/MarketingHeader.vue'
import MarketingPaperPlanes from '~/components/MarketingPaperPlanes.vue'
import ProductSwitcher from '~/components/ProductSwitcher.vue'
import { MARKETING_HERO_SCREENSHOT_SRC } from '~/utils/marketingHeroScreenshot'
import { captureReferralFromSearch, storeReferralCode } from '~/utils/referralCapture'

const heroScreenshotSrc = MARKETING_HERO_SCREENSHOT_SRC

const { theme, isDark, applyDocumentTheme } = useTheme()

/** Landing stays visually dark (cockpit aesthetic) but drops `html.dark` so `dark:` utilities do not apply (e.g. Auth modal). Restore saved theme when leaving. */
if (import.meta.client) {
  applyDocumentTheme('light')
  onBeforeUnmount(() => {
    applyDocumentTheme(theme.value)
  })
  watch([theme, isDark], () => {
    applyDocumentTheme('light')
  })
}

/** Email links that still use Site URL (/) land here with tokens in the URL; forward to /auth/callback. */
onMounted(() => {
  rememberLandingReferral()
  if (typeof window === 'undefined') return
  const searchParams = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const hasAuthQuery =
    searchParams.has('code') || searchParams.has('error') || searchParams.has('error_description')
  const hasAuthHash =
    hashParams.has('access_token') || hashParams.has('error') || hashParams.has('error_description')
  if (hasAuthQuery || hasAuthHash) {
    const next = `/auth/callback${window.location.search}${window.location.hash}`
    window.location.replace(next)
  }
})

const showAuth = ref(false)
const authTab = ref<'signin' | 'signup'>('signin')
const landingReferralCode = ref<string | null>(null)

function rememberLandingReferral() {
  if (typeof window === 'undefined') return
  const code = captureReferralFromSearch(window.location.search)
  if (!code) return
  storeReferralCode(code)
  landingReferralCode.value = code
}

const openAuth = (tab: 'signin' | 'signup') => {
  authTab.value = tab
  showAuth.value = true
}

const handleAuthSuccess = () => {
  window.location.href = '/dashboard'
}

useHead({
  title: 'Logifi — Airline pilot logbook',
  meta: [
    {
      name: 'description',
      content:
        'Free, open-source digital logbook for airline flying. Autofi FLICA import, Digifi paper scanning, import from other apps, and export.',
    },
  ],
})
</script>
