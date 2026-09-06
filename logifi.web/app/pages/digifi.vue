<template>
  <div class="min-h-screen bg-[#e4e8e7] font-quicksand text-gray-900 overflow-x-hidden dark:bg-[#e4e8e7] dark:text-gray-900">
    <MarketingHeader active-page="digifi" logo-href="/" @open-auth="openAuth" />

    <main>
      <section class="relative pt-32 pb-48 lg:pt-48 lg:pb-64 overflow-hidden bg-[url('/images/hero-bg.png')] bg-cover bg-center bg-no-repeat">
        <!-- Digifi-distinct color wash -->
        <div class="absolute inset-0 bg-gradient-to-br from-orange-50/60 via-amber-50/50 to-yellow-50/40 backdrop-blur-[1px] z-0"></div>
        <div
          class="absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(255,251,235,0.52)_0%,rgba(254,243,199,0.18)_24%,transparent_48%,rgba(251,191,36,0.04)_68%,rgba(245,158,11,0.08)_88%,rgba(234,179,8,0.12)_100%)]"
        ></div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div class="flex flex-col items-center gap-4 mb-8">
            <ProductSwitcher active-product="digifi" />
            <div class="inline-flex items-center px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-xs font-semibold shadow-[0_0_22px_-6px_rgba(251,146,60,0.38),0_0_36px_-12px_rgba(249,115,22,0.18)] animate-fade-in dark:bg-orange-50 dark:border-orange-200 dark:text-orange-800">
              First 10 pages free
            </div>
          </div>
          
          <h1 class="text-5xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-8 animate-slide-up dark:text-gray-900">
            Scan your <br />
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-600 dark:to-amber-600">paper logbook</span>
          </h1>
          
          <p class="max-w-2xl mx-auto text-xl text-gray-700 mb-12 animate-slide-up delay-100 dark:text-gray-700">
            Photograph your logbook pages. Digifi transcribes them for you to review and import.
          </p>
          
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up delay-200">
            <button 
              @click="handleStartScanning"
              class="btn-cta-primary w-full sm:w-auto px-8 py-4 bg-orange-600 text-white text-lg font-bold rounded-xl hover:bg-orange-700 transition-all ring-1 ring-orange-400/60 shadow-[0_0_18px_-3px_rgba(249,115,22,0.48),0_0_36px_-12px_rgba(251,146,60,0.22)] hover:shadow-[0_0_28px_-2px_rgba(249,115,22,0.55),0_0_48px_-10px_rgba(251,146,60,0.28)] active:scale-[0.98] dark:bg-orange-600 dark:text-white dark:hover:bg-orange-700"
            >
              <span class="relative z-10">{{ isAuthenticated ? 'Continue Scanning' : 'Start Scanning' }}</span>
            </button>
            <NuxtLink 
              to="/"
              class="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 text-lg font-bold rounded-xl border border-[#d1d8d6] shadow-[0_0_18px_-8px_rgba(251,146,60,0.14)] hover:border-orange-200 hover:bg-orange-50/50 hover:shadow-[0_0_28px_-6px_rgba(251,146,60,0.24),0_0_40px_-10px_rgba(249,115,22,0.14)] transition-all active:scale-[0.98] dark:bg-white dark:text-gray-900 dark:border-[#d1d8d6] dark:hover:border-orange-200 dark:hover:bg-orange-50/50"
            >
              Learn More
            </NuxtLink>
          </div>
        </div>
      </section>

      <div class="relative overflow-hidden -mt-48 lg:-mt-64 z-10">
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

        <section id="how-it-works" class="relative z-10 scroll-mt-28 pt-24 pb-14 lg:pb-16">
          <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
              <h2 class="text-3xl font-bold text-gray-950 sm:text-4xl drop-shadow-sm dark:text-gray-900">How Digifi Works</h2>
            </div>

            <div class="relative overflow-hidden rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_0_42px_-12px_rgba(59,130,246,0.24),0_0_56px_-18px_rgba(37,99,235,0.14)] p-6 sm:p-8 lg:px-10 lg:pt-10 lg:pb-8">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/15 flex flex-col shadow-[0_0_32px_-10px_rgba(251,146,60,0.28)]">
                  <div class="w-12 h-12 bg-orange-50/70 rounded-xl flex items-center justify-center text-orange-600 mb-6 dark:bg-orange-50/70 dark:text-orange-600 font-bold text-xl">
                    1
                  </div>
                  <h3 class="text-xl font-bold mb-3 dark:text-gray-900">Photograph Pages</h3>
                  <p class="text-gray-700 leading-relaxed dark:text-gray-700">Take photos of your paper logbook pages. Flat, bright, and in frame work best.</p>
                </div>

                <div class="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/15 flex flex-col shadow-[0_0_32px_-10px_rgba(251,146,60,0.28)]">
                  <div class="w-12 h-12 bg-orange-50/70 rounded-xl flex items-center justify-center text-orange-600 mb-6 dark:bg-orange-50/70 dark:text-orange-600 font-bold text-xl">
                    2
                  </div>
                  <h3 class="text-xl font-bold mb-3 dark:text-gray-900">AI Transcription</h3>
                  <p class="text-gray-700 leading-relaxed dark:text-gray-700">Digifi extracts flight entries from the photos. About 70% accuracy tested on one logbook.</p>
                </div>

                <div class="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/15 flex flex-col shadow-[0_0_32px_-10px_rgba(251,146,60,0.28)]">
                  <div class="w-12 h-12 bg-orange-50/70 rounded-xl flex items-center justify-center text-orange-600 mb-6 dark:bg-orange-50/70 dark:text-orange-600 font-bold text-xl">
                    3
                  </div>
                  <h3 class="text-xl font-bold mb-3 dark:text-gray-900">Review & Import</h3>
                  <p class="text-gray-700 leading-relaxed dark:text-gray-700">Check every cell before importing to your digital logbook or exporting.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </main>

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
import ProductSwitcher from '~/components/ProductSwitcher.vue'
import { useAuth } from '~/composables/useAuth'

const { theme, isDark, applyDocumentTheme } = useTheme()
const { isAuthenticated } = useAuth()
const router = useRouter()

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
const authTab = ref<'signin' | 'signup'>('signup')

const openAuth = (tab: 'signin' | 'signup') => {
  authTab.value = tab
  showAuth.value = true
}

const handleAuthSuccess = () => {
  router.push('/logbook-builder?digifi=open')
}

const handleStartScanning = () => {
  if (isAuthenticated.value) {
    router.push('/logbook-builder?digifi=open')
  } else {
    authTab.value = 'signup'
    showAuth.value = true
  }
}

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
</script>
