<template>
  <!-- Force light theme on landing but use dark cockpit palette -->
  <div class="min-h-screen bg-[#0a0e1a] font-quicksand text-gray-100 overflow-x-hidden dark:bg-[#0a0e1a] dark:text-gray-100">
    <MarketingHeader active-page="digifi" logo-href="/" @open-auth="openAuth" />

    <!-- Main content wrapper with relative positioning for absolute planes -->
    <div class="relative">
    <!-- Paper airplanes animation layer - scrolls with page (Digifi orange/amber theme) -->
    <div class="paper-planes-container absolute inset-0 z-[1] pointer-events-none" aria-hidden="true" style="height: 100%;">
      <!-- Plane 1: Large figure-8 -->
      <div class="paper-plane plane-1">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" class="text-orange-400" style="opacity: 0.5;"/>
        </svg>
      </div>
      
      <!-- Plane 2: Medium, loop-de-loop -->
      <div class="paper-plane plane-2">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" class="text-amber-400" style="opacity: 0.45;"/>
        </svg>
      </div>
      
      <!-- Plane 3: Medium, fast arc -->
      <div class="paper-plane plane-3">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" class="text-orange-300" style="opacity: 0.4;"/>
        </svg>
      </div>
      
      <!-- Plane 4: Large, gentle swoop -->
      <div class="paper-plane plane-4">
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" class="text-amber-300" style="opacity: 0.55;"/>
        </svg>
      </div>
      
      <!-- Plane 5: Large, wide loop -->
      <div class="paper-plane plane-5">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" class="text-orange-400" style="opacity: 0.48;"/>
        </svg>
      </div>
      
      <!-- Plane 6: Small accent in upper corner -->
      <div class="paper-plane plane-6">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" class="text-amber-500" style="opacity: 0.42;"/>
        </svg>
      </div>
      
      <!-- Plane 7: Mid-page cruiser -->
      <div class="paper-plane plane-7">
        <svg width="58" height="58" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" class="text-orange-400" style="opacity: 0.46;"/>
        </svg>
      </div>
      
      <!-- Plane 8: Lower section accent -->
      <div class="paper-plane plane-8">
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" class="text-amber-400" style="opacity: 0.38;"/>
        </svg>
      </div>
    </div>

    <!-- Hero Section -->
    <main>
      <section class="relative pt-32 pb-20 lg:pt-48 lg:pb-28 overflow-hidden">
        <!-- Subtle grid background pattern (orange/amber theme) -->
        <div class="absolute inset-0 z-0 opacity-[0.03]" style="background-image: linear-gradient(rgba(251, 146, 60, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(251, 146, 60, 0.4) 1px, transparent 1px); background-size: 40px 40px;"></div>
        
        <!-- Gradient overlay -->
        <div class="absolute inset-0 z-0 bg-gradient-to-b from-[#0a0e1a] via-[#0f1423] to-[#0a0e1a]"></div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div class="flex flex-col items-center gap-4 mb-8">
            <ProductSwitcher active-product="digifi" />
            <div class="inline-flex items-center px-3 py-1.5 rounded-lg bg-orange-950/40 border border-orange-800/30 text-orange-400 text-xs font-semibold backdrop-blur-sm">
              First 10 pages free
            </div>
          </div>
          
          <h1 class="text-5xl lg:text-7xl font-bold tracking-tight text-gray-100 mb-6 leading-[1.1]">
            Scan your <span class="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">paper logbook</span>
          </h1>
          
          <p class="max-w-2xl mx-auto text-xl text-gray-400 mb-12 leading-relaxed">
            Photograph your logbook pages. Digifi transcribes them for you to review and import.
          </p>
          
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              @click="handleStartScanning"
              class="btn-cta-primary w-full sm:w-auto px-8 py-4 bg-orange-600 text-white text-lg font-bold rounded-lg hover:bg-orange-700 transition-all border border-orange-500/50 shadow-lg shadow-orange-900/50 hover:shadow-xl hover:shadow-orange-900/60 active:scale-[0.98]"
            >
              <span class="relative z-10">{{ isAuthenticated ? 'Continue Scanning' : 'Start Scanning' }}</span>
            </button>
            <NuxtLink 
              to="/"
              class="w-full sm:w-auto px-8 py-4 bg-gray-800/50 text-gray-100 text-lg font-bold rounded-lg border border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/70 hover:border-gray-600/50 transition-all active:scale-[0.98]"
            >
              Learn More
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- How it Works -->
      <section class="relative py-20 lg:py-28 overflow-hidden bg-gradient-to-b from-[#0a0e1a] via-[#0d1220] to-[#0a0e1a]">
        <!-- Subtle diagonal lines pattern (orange theme) -->
        <div class="absolute inset-0 z-0 opacity-[0.02]" style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(251, 146, 60, 0.3) 35px, rgba(251, 146, 60, 0.3) 36px);"></div>
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div class="text-center mb-16">
            <h2 class="text-3xl sm:text-4xl font-bold text-gray-100 mb-3">How Digifi Works</h2>
            <p class="text-gray-400 text-lg">Photograph, transcribe, review</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Step 1 -->
            <div class="bg-gray-900/40 backdrop-blur-sm p-8 rounded-xl border border-gray-800/50 hover:border-orange-800/50 transition-all">
              <div class="w-10 h-10 bg-orange-600/20 rounded-lg flex items-center justify-center text-orange-400 mb-4 font-bold text-xl">
                1
              </div>
              <h3 class="text-xl font-bold text-gray-100 mb-3">Photograph Pages</h3>
              <p class="text-gray-400 leading-relaxed">
                Take photos of your paper logbook pages. Flat, bright, and in frame work best.
              </p>
            </div>

            <!-- Step 2 -->
            <div class="bg-gray-900/40 backdrop-blur-sm p-8 rounded-xl border border-gray-800/50 hover:border-orange-800/50 transition-all">
              <div class="w-10 h-10 bg-orange-600/20 rounded-lg flex items-center justify-center text-orange-400 mb-4 font-bold text-xl">
                2
              </div>
              <h3 class="text-xl font-bold text-gray-100 mb-3">AI Transcription</h3>
              <p class="text-gray-400 leading-relaxed">
                Digifi extracts flight entries from the photos. About 70% accuracy tested on one logbook.
              </p>
            </div>

            <!-- Step 3 -->
            <div class="bg-gray-900/40 backdrop-blur-sm p-8 rounded-xl border border-gray-800/50 hover:border-orange-800/50 transition-all">
              <div class="w-10 h-10 bg-orange-600/20 rounded-lg flex items-center justify-center text-orange-400 mb-4 font-bold text-xl">
                3
              </div>
              <h3 class="text-xl font-bold text-gray-100 mb-3">Review & Import</h3>
              <p class="text-gray-400 leading-relaxed">
                Check every cell before importing to your digital logbook or exporting.
              </p>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
    </div>

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

/** Digifi landing stays visually dark (matching Logifi cockpit aesthetic) but drops `html.dark` so `dark:` utilities do not apply (e.g. Auth modal). Restore saved theme when leaving. */
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

<style scoped>
.paper-planes-container {
  overflow: visible;
  pointer-events: none;
}

.paper-plane {
  position: absolute;
  will-change: transform;
  background: none !important;
}

.paper-plane svg {
  display: block;
  background: none !important;
  overflow: visible;
}

/* Plane 1: Large figure-8 loop across hero, 60s */
.plane-1 {
  top: 10%;
  left: -8%;
  offset-path: path('M 0 0 Q 200 -150 400 -80 Q 600 150 800 80 Q 1000 -120 1200 120');
  offset-rotate: auto;
  animation: path-1 60s ease-in-out infinite;
}

@keyframes path-1 {
  0% { offset-distance: 0%; }
  100% { offset-distance: 100%; }
}

/* Plane 2: Loop-de-loop from right side, 45s */
.plane-2 {
  top: 35%;
  left: 105%;
  offset-path: path('M 0 0 Q -250 -120 -500 -80 Q -700 100 -900 200 Q -1050 120 -1150 -50');
  offset-rotate: auto;
  animation: path-2 45s ease-in-out infinite;
}

@keyframes path-2 {
  0% { offset-distance: 0%; }
  100% { offset-distance: 100%; }
}

/* Plane 3: Fast arc across center, 35s */
.plane-3 {
  top: 55%;
  left: -8%;
  offset-path: path('M 0 0 Q 300 -200 600 -150 Q 900 80 1150 200');
  offset-rotate: auto;
  animation: path-3 35s linear infinite;
}

@keyframes path-3 {
  0% { offset-distance: 0%; }
  100% { offset-distance: 100%; }
}

/* Plane 4: Large gentle swoop in upper area (very visible), 50s */
.plane-4 {
  top: 8%;
  left: 105%;
  offset-path: path('M 0 0 Q -300 180 -600 120 Q -850 -80 -1050 -150');
  offset-rotate: auto;
  animation: path-4 50s ease-in-out infinite;
}

@keyframes path-4 {
  0% { offset-distance: 0%; }
  100% { offset-distance: 100%; }
}

/* Plane 5: Wide loop through middle, 55s */
.plane-5 {
  top: 45%;
  left: -12%;
  offset-path: path('M 0 0 Q 250 -180 550 -250 Q 850 -180 1050 50 Q 1100 120 1150 180');
  offset-rotate: auto;
  animation: path-5 55s ease-in-out infinite;
}

@keyframes path-5 {
  0% { offset-distance: 0%; }
  100% { offset-distance: 100%; }
}

/* Plane 6: Upper corner accent, quick loop, 40s */
.plane-6 {
  top: 5%;
  right: 5%;
  offset-path: path('M 0 0 Q -150 100 -300 150 Q -400 120 -450 100');
  offset-rotate: auto;
  animation: path-6 40s ease-in-out infinite;
}

@keyframes path-6 {
  0% { offset-distance: 0%; }
  100% { offset-distance: 100%; }
}

/* Plane 7: Mid-page cruiser, gentle across, 48s */
.plane-7 {
  top: 50%;
  left: -10%;
  offset-path: path('M 0 0 Q 300 -80 650 -50 Q 800 0 950 30');
  offset-rotate: auto;
  animation: path-7 48s ease-in-out infinite;
}

@keyframes path-7 {
  0% { offset-distance: 0%; }
  100% { offset-distance: 100%; }
}

/* Plane 8: Lower section, slow arc, 52s */
.plane-8 {
  top: 75%;
  right: -8%;
  offset-path: path('M 0 0 Q -200 80 -450 120 Q -700 80 -950 -50');
  offset-rotate: auto;
  animation: path-8 52s ease-in-out infinite;
}

@keyframes path-8 {
  0% { offset-distance: 0%; }
  100% { offset-distance: 100%; }
}

/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .paper-plane {
    animation: none !important;
    opacity: 0.2 !important;
  }
  
  .plane-1 { top: 15%; left: 15%; transform: rotate(45deg); }
  .plane-2 { top: 40%; right: 20%; transform: rotate(180deg); }
  .plane-3 { top: 60%; left: 25%; transform: rotate(90deg); }
  .plane-4 { top: 12%; right: 30%; transform: rotate(225deg); }
  .plane-5 { top: 50%; left: 45%; transform: rotate(135deg); }
  .plane-6 { top: 8%; right: 8%; transform: rotate(90deg); }
  .plane-7 { top: 55%; left: 35%; transform: rotate(60deg); }
  .plane-8 { top: 75%; right: 25%; transform: rotate(200deg); }
}
</style>
