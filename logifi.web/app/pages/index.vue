<template>
  <!-- Force light theme on landing: dark: overrides so links/header stay light even when app uses dark mode -->
  <div class="min-h-screen bg-[#e4e8e7] font-quicksand text-gray-900 overflow-x-hidden dark:bg-[#e4e8e7] dark:text-gray-900">
    <MarketingHeader active-page="home" :logo-href="null" @open-auth="openAuth" />

    <!-- Hero Section -->
    <main>
      <section class="relative pt-32 pb-48 lg:pt-48 lg:pb-64 overflow-hidden bg-[url('/images/hero-bg.png')] bg-cover bg-center bg-no-repeat">
        <!-- Overlay to ensure text readability -->
        <div class="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-0"></div>
        <div
          class="absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.46)_0%,rgba(255,255,255,0.12)_24%,transparent_48%,rgba(228,232,231,0.06)_68%,rgba(228,232,231,0.28)_88%,rgba(228,232,231,0.55)_100%)]"
        ></div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div class="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-8 shadow-[0_0_22px_-6px_rgba(59,130,246,0.38),0_0_36px_-12px_rgba(37,99,235,0.18)] animate-fade-in dark:bg-blue-50 dark:border-blue-100 dark:text-blue-700">
            Free logbook · Open source
          </div>
          
          <h1 class="text-5xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-8 animate-slide-up dark:text-gray-900">
            A digital <br />
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-600 dark:to-indigo-600">flight logbook</span>
          </h1>
          
          <p class="max-w-2xl mx-auto text-xl text-gray-700 mb-12 animate-slide-up delay-100 dark:text-gray-700">
            Import your logbook, scan paper with Digifi, pull schedule with Autofi, and export when you need to.
          </p>
          
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up delay-200">
            <button 
              @click="openAuth('signup')"
              class="btn-cta-primary w-full sm:w-auto px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-xl hover:bg-blue-700 transition-all ring-1 ring-blue-400/60 shadow-[0_0_18px_-3px_rgba(37,99,235,0.48),0_0_36px_-12px_rgba(59,130,246,0.22)] hover:shadow-[0_0_28px_-2px_rgba(37,99,235,0.55),0_0_48px_-10px_rgba(59,130,246,0.28)] active:scale-[0.98] dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
            >
              <span class="relative z-10">Get Started</span>
            </button>
            <button 
              @click="openAuth('signin')"
              class="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 text-lg font-bold rounded-xl border border-[#d1d8d6] shadow-[0_0_18px_-8px_rgba(59,130,246,0.14)] hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-[0_0_28px_-6px_rgba(59,130,246,0.24),0_0_40px_-10px_rgba(37,99,235,0.14)] transition-all active:scale-[0.98] dark:bg-white dark:text-gray-900 dark:border-[#d1d8d6] dark:hover:border-blue-200 dark:hover:bg-blue-50/50"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      <!-- Features + footer share one photo stack so the glass footer sits over the same sky -->
      <div class="relative overflow-hidden -mt-48 lg:-mt-64 z-10">
        <!-- Background layers with crossfade mask -->
        <div 
          class="pointer-events-none absolute inset-0 z-0"
          style="-webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 12rem); mask-image: linear-gradient(to bottom, transparent 0%, black 12rem);"
        >
          <div
            class="absolute inset-0 bg-[url('/images/features-bg.png')] bg-cover bg-[position:center_32%] contrast-[1.04] saturate-[1.08]"
            aria-hidden="true"
          ></div>
          <div
            class="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,rgba(228,232,231,0.14)_12%,rgba(228,232,231,0.34)_38%,rgba(228,232,231,0.52)_72%,rgba(228,232,231,0.62)_100%)]"
            aria-hidden="true"
          ></div>
          <div class="absolute inset-0 bg-white/6" aria-hidden="true"></div>
        </div>

        <section id="features" class="relative z-10 scroll-mt-28 pt-24 pb-14 lg:pb-16">
        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl font-bold text-gray-950 sm:text-4xl drop-shadow-sm dark:text-gray-900">Features</h2>
          </div>

          <div class="relative overflow-hidden rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_0_42px_-12px_rgba(59,130,246,0.24),0_0_56px_-18px_rgba(37,99,235,0.14)] p-6 sm:p-8 lg:px-10 lg:pt-10 lg:pb-8">
            <!-- Current Features -->
            <div class="mb-14 relative z-10">
              <h3 class="text-2xl font-bold text-gray-900 mb-8 text-center dark:text-gray-900">Features</h3>
              <div class="grid grid-cols-1 md:grid-cols-6 gap-5 md:gap-6 md:auto-rows-min">
                <!-- Featured: Autofi (left) + Digifi compact (right) -->
                <div
                  class="md:col-span-3 bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/15 flex flex-col md:h-full ring-1 ring-blue-400/35 shadow-[0_0_48px_-8px_rgba(59,130,246,0.38)]"
                >
                  <div class="w-12 h-12 bg-blue-50/70 rounded-xl flex items-center justify-center text-blue-600 mb-6 dark:bg-blue-50/70 dark:text-blue-600">
                    <Icon :name="featuredFeature.icon" size="24" />
                  </div>
                  <div class="mb-3">
                    <h3 class="text-2xl sm:text-3xl font-bold tracking-tight dark:text-gray-900">
                      <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-600 dark:to-indigo-600">
                        {{ featuredFeature.title }}
                      </span>
                    </h3>
                    <p class="mt-1.5 text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-600">
                      {{ featuredFeature.tagline }}
                    </p>
                  </div>
                  <p class="text-gray-700 leading-relaxed dark:text-gray-700 md:grow">{{ featuredFeature.description }}</p>
                </div>

                <div
                  class="md:col-span-3 bg-white/10 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-white/15 flex flex-col md:h-full shadow-[0_0_32px_-10px_rgba(59,130,246,0.28)]"
                >
                  <div class="w-12 h-12 bg-blue-50/70 rounded-xl flex items-center justify-center text-blue-600 mb-4 dark:bg-blue-50/70 dark:text-blue-600">
                    <Icon :name="secondaryFeature.icon" size="24" />
                  </div>
                  <h3 class="text-xl font-bold mb-2 dark:text-gray-900">{{ secondaryFeature.title }}</h3>
                  <p class="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-3 dark:text-gray-600">
                    {{ secondaryFeature.tagline }}
                  </p>
                  <p class="text-gray-700 leading-relaxed dark:text-gray-700 md:grow">{{ secondaryFeature.description }}</p>
                </div>

                <!-- Standard feature cards -->
                <div
                  v-for="(feature, i) in standardFeatures"
                  :key="i"
                  class="md:col-span-3 bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/15 flex flex-col md:h-full shadow-[0_0_32px_-10px_rgba(59,130,246,0.28)]"
                >
                  <div class="w-12 h-12 bg-blue-50/70 rounded-xl flex items-center justify-center text-blue-600 mb-6 dark:bg-blue-50/70 dark:text-blue-600">
                    <Icon :name="feature.icon" size="24" />
                  </div>
                  <h3 class="text-xl font-bold mb-3 dark:text-gray-900">{{ feature.title }}</h3>
                  <p class="text-gray-700 leading-relaxed dark:text-gray-700 md:grow">{{ feature.description }}</p>
                </div>
              </div>
            </div>

            <!-- On the roadmap -->
            <div class="relative z-10">
              <h3 class="text-2xl font-bold text-gray-900 mb-8 text-center dark:text-gray-900">On the roadmap</h3>
              <div class="grid grid-cols-1 md:grid-cols-6 gap-5 md:gap-6 md:auto-rows-min">
                <div
                  v-for="(feature, i) in featuresToCome"
                  :key="i"
                  class="md:col-span-3 bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/15 flex flex-col md:h-full shadow-[0_0_32px_-10px_rgba(59,130,246,0.28)]"
                >
                  <div class="w-12 h-12 bg-blue-50/70 rounded-xl flex items-center justify-center text-blue-600 mb-6 dark:bg-blue-50/70 dark:text-blue-600">
                    <Icon :name="feature.icon" size="24" />
                  </div>
                  <h3 class="text-xl font-bold mb-3 dark:text-gray-900">{{ feature.title }}</h3>
                  <p class="text-gray-700 leading-relaxed dark:text-gray-700 md:grow">{{ feature.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </section>

      <MarketingFooter />
      </div>
    </main>

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
import MarketingFooter from '~/components/MarketingFooter.vue'
import MarketingHeader from '~/components/MarketingHeader.vue'

const { theme, isDark, applyDocumentTheme } = useTheme()

/** Landing stays visually light and drops `html.dark` so `dark:` utilities do not apply (e.g. Auth modal). Restore saved theme when leaving. */
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

const openAuth = (tab: 'signin' | 'signup') => {
  authTab.value = tab
  showAuth.value = true
}

const handleAuthSuccess = () => {
  // In Core, after auth we send users to the main app dashboard
  window.location.href = '/dashboard'
}

const featuredFeature = {
  title: 'Autofi',
  tagline: 'Airline schedule → logbook',
  description:
    'Connect FLICA in Settings, preview scheduled legs, and import into your logbook. Duplicates are skipped. Free with the core logbook.',
  icon: 'ri:flight-takeoff-line',
} as const

const secondaryFeature = {
  title: 'Digifi',
  tagline: 'Paper logbook scanning',
  description:
    'Photograph logbook spreads; AI transcribes for you to review before import. First 10 spreads on the house.',
  icon: 'ri:scan-line',
} as const

const standardFeatures = [
  {
    title: 'Open Source Logbook',
    description: 'View the code on GitHub. Report issues or open a pull request.',
    icon: 'ri:open-source-line',
  },
  {
    title: 'AC 120-78B design',
    description:
      'Signed rows are amended or voided, not edited. Audit trail, signatures, and export follow AC 120-78B.',
    icon: 'ri:shield-check-line',
  },
  {
    title: 'Import & export',
    description:
      'Import CSV yourself, or request a reviewed transfer. Export CSV, JSON, or Form 8710 when you need to.',
    icon: 'ri:file-download-line',
  },
  {
    title: 'iOS app',
    description: 'Log flights, check currency, and scan pages from your phone.',
    icon: 'ri:smartphone-line',
  },
] as const

const featuresToCome = [
  {
    title: 'Student/Instructor Portals',
    description: 'Dedicated portals for flight training with progress tracking and collaborative logbook management.',
    icon: 'ri:user-star-line',
  },
  {
    title: 'Community feedback',
    description: 'Suggest features on GitHub or Discord.',
    icon: 'ri:community-line',
  },
] as const

</script>
