<template>
  <!-- Force light theme on landing: dark: overrides so links/header stay light even when app uses dark mode -->
  <div class="min-h-screen bg-[#0a0e1a] font-quicksand text-gray-100 overflow-x-hidden dark:bg-[#0a0e1a] dark:text-gray-100">
    <MarketingHeader active-page="home" :logo-href="null" @open-auth="openAuth" />

    <!-- Hero Section -->
    <main>
      <section class="relative pt-32 pb-20 lg:pt-48 lg:pb-28 overflow-hidden">
        <!-- Paper airplanes animation layer -->
        <div class="paper-planes-container absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
          <!-- Plane 1: Large, slow figure-8 -->
          <div class="paper-plane plane-1">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" opacity="0.15" class="text-blue-400"/>
            </svg>
          </div>
          
          <!-- Plane 2: Medium, loop-de-loop -->
          <div class="paper-plane plane-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" opacity="0.12" class="text-cyan-400"/>
            </svg>
          </div>
          
          <!-- Plane 3: Small, fast arc -->
          <div class="paper-plane plane-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" opacity="0.1" class="text-blue-300"/>
            </svg>
          </div>
          
          <!-- Plane 4: Medium, gentle swoop -->
          <div class="paper-plane plane-4">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" opacity="0.13" class="text-indigo-400"/>
            </svg>
          </div>
          
          <!-- Plane 5: Large, wide loop -->
          <div class="paper-plane plane-5">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3l18 9-18 9 3-9-3-9z" fill="currentColor" opacity="0.11" class="text-cyan-300"/>
            </svg>
          </div>
        </div>
        
        <!-- Subtle grid background pattern -->
        <div class="absolute inset-0 z-0 opacity-[0.03]" style="background-image: linear-gradient(rgba(59, 130, 246, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.4) 1px, transparent 1px); background-size: 40px 40px;"></div>
        
        <!-- Gradient overlay -->
        <div class="absolute inset-0 z-0 bg-gradient-to-b from-[#0a0e1a] via-[#0f1423] to-[#0a0e1a]"></div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div class="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-950/40 border border-blue-800/30 text-blue-400 text-xs font-semibold mb-8 backdrop-blur-sm">
            Free · Open source
          </div>
          
          <h1 class="text-5xl lg:text-7xl font-bold tracking-tight text-gray-100 mb-6 leading-[1.1]">
            The airline pilot <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">logbook.</span>
          </h1>
          
          <p class="max-w-2xl mx-auto text-xl text-gray-400 mb-12 leading-relaxed">
            Built for 121 CA and FO flying — pairings, legs, and hours that match the job. Not a student kitchen sink.
          </p>
          
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              @click="openAuth('signup')"
              class="btn-cta-primary w-full sm:w-auto px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-lg hover:bg-blue-700 transition-all border border-blue-500/50 shadow-lg shadow-blue-900/50 hover:shadow-xl hover:shadow-blue-900/60 active:scale-[0.98]"
            >
              <span class="relative z-10">Open Logifi</span>
            </button>
            <button 
              @click="scrollToAutofi"
              class="w-full sm:w-auto px-8 py-4 bg-gray-800/50 text-gray-100 text-lg font-bold rounded-lg border border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/70 hover:border-gray-600/50 transition-all active:scale-[0.98]"
            >
              See Autofi
            </button>
          </div>
        </div>
      </section>

      <!-- How hours get in -->
      <section class="relative py-20 lg:py-28 overflow-hidden bg-gradient-to-b from-[#0a0e1a] via-[#0d1220] to-[#0a0e1a]">
        <!-- Subtle diagonal lines pattern -->
        <div class="absolute inset-0 z-0 opacity-[0.02]" style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(59, 130, 246, 0.3) 35px, rgba(59, 130, 246, 0.3) 36px);"></div>
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div class="text-center mb-16">
            <h2 class="text-3xl sm:text-4xl font-bold text-gray-100 mb-3">How hours get in</h2>
            <p class="text-gray-400 text-lg">Supporting paths into the book, not co-equal products</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Autofi -->
            <div id="autofi-section" class="bg-gray-900/40 backdrop-blur-sm p-8 rounded-xl border border-gray-800/50 hover:border-blue-800/50 transition-all">
              <div class="flex items-start gap-3 mb-4">
                <div class="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-400 flex-shrink-0">
                  <Icon name="ri:flight-takeoff-line" size="20" />
                </div>
                <div>
                  <h3 class="text-xl font-bold text-gray-100">Autofi</h3>
                  <AutofiBetaPill tone="marketing" class="mt-1" />
                </div>
              </div>
              <p class="text-gray-400 leading-relaxed">
                Pulls your Flica pairings into the book so you're not typing after a trip. Free while in beta.
              </p>
            </div>

            <!-- Digifi -->
            <div class="bg-gray-900/40 backdrop-blur-sm p-8 rounded-xl border border-gray-800/50 hover:border-blue-800/50 transition-all">
              <div class="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-400 mb-4">
                <Icon name="ri:scan-line" size="20" />
              </div>
              <h3 class="text-xl font-bold text-gray-100 mb-3">Digifi</h3>
              <p class="text-gray-400 leading-relaxed">
                Scan paper spreads into Logifi when you're coming off a paper book. Credits for scans.
              </p>
            </div>

            <!-- Import -->
            <div class="bg-gray-900/40 backdrop-blur-sm p-8 rounded-xl border border-gray-800/50 hover:border-blue-800/50 transition-all">
              <div class="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-400 mb-4">
                <Icon name="ri:file-download-line" size="20" />
              </div>
              <h3 class="text-xl font-bold text-gray-100 mb-3">Import</h3>
              <p class="text-gray-400 leading-relaxed">
                Bring an existing digital logbook with you.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- The book -->
      <section class="relative py-20 lg:py-28 overflow-hidden">
        <!-- Grid pattern -->
        <div class="absolute inset-0 z-0 opacity-[0.03]" style="background-image: linear-gradient(rgba(59, 130, 246, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.4) 1px, transparent 1px); background-size: 40px 40px;"></div>
        <div class="absolute inset-0 z-0 bg-gradient-to-b from-[#0a0e1a] via-transparent to-[#0a0e1a]"></div>
        
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 class="text-3xl sm:text-4xl font-bold text-gray-100 mb-6">What the book is</h2>
          <p class="text-xl text-gray-300 leading-relaxed">
            One professional logbook for airline flying. Totals, history, export when you need it. Built by a Republic captain who got tired of the alternatives.
          </p>
        </div>
      </section>

      <MarketingFooter />
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
import AutofiBetaPill from '~/components/fcv/AutofiBetaPill.vue'
import MarketingFooter from '~/components/MarketingFooter.vue'
import MarketingHeader from '~/components/MarketingHeader.vue'

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
  window.location.href = '/dashboard'
}

const scrollToAutofi = () => {
  const autofiSection = document.getElementById('autofi-section')
  if (autofiSection) {
    autofiSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}
</script>

<style scoped>
/* Paper airplane animations - respect prefers-reduced-motion */
.paper-planes-container {
  overflow: hidden;
}

.paper-plane {
  position: absolute;
  will-change: transform;
}

/* Plane 1: Large figure-8 loop, 60s */
.plane-1 {
  animation: figure8-1 60s ease-in-out infinite;
  top: 15%;
  left: -5%;
}

@keyframes figure8-1 {
  0%, 100% { 
    transform: translate(0, 0) rotate(0deg); 
  }
  12.5% { 
    transform: translate(15vw, -8vh) rotate(45deg); 
  }
  25% { 
    transform: translate(30vw, 0) rotate(90deg); 
  }
  37.5% { 
    transform: translate(45vw, 10vh) rotate(135deg); 
  }
  50% { 
    transform: translate(60vw, 0) rotate(180deg); 
  }
  62.5% { 
    transform: translate(75vw, -10vh) rotate(225deg); 
  }
  75% { 
    transform: translate(90vw, 0) rotate(270deg); 
  }
  87.5% { 
    transform: translate(105vw, 8vh) rotate(315deg); 
  }
}

/* Plane 2: Loop-de-loop, 45s */
.plane-2 {
  animation: loopdeloop-2 45s ease-in-out infinite;
  top: 40%;
  left: 100%;
}

@keyframes loopdeloop-2 {
  0%, 100% { 
    transform: translate(0, 0) rotate(180deg); 
  }
  15% { 
    transform: translate(-20vw, -5vh) rotate(225deg); 
  }
  30% { 
    transform: translate(-40vw, 0) rotate(270deg); 
  }
  45% { 
    transform: translate(-60vw, 8vh) rotate(315deg); 
  }
  60% { 
    transform: translate(-80vw, 15vh) rotate(360deg); 
  }
  75% { 
    transform: translate(-95vw, 8vh) rotate(405deg); 
  }
  90% { 
    transform: translate(-105vw, 0) rotate(450deg); 
  }
}

/* Plane 3: Fast arc, 35s */
.plane-3 {
  animation: arc-3 35s linear infinite;
  top: 60%;
  left: -5%;
}

@keyframes arc-3 {
  0% { 
    transform: translate(0, 0) rotate(0deg); 
  }
  25% { 
    transform: translate(25vw, -15vh) rotate(60deg); 
  }
  50% { 
    transform: translate(55vw, -10vh) rotate(120deg); 
  }
  75% { 
    transform: translate(85vw, 5vh) rotate(180deg); 
  }
  100% { 
    transform: translate(110vw, 15vh) rotate(240deg); 
  }
}

/* Plane 4: Gentle swoop, 50s */
.plane-4 {
  animation: swoop-4 50s ease-in-out infinite;
  top: 25%;
  left: 100%;
}

@keyframes swoop-4 {
  0%, 100% { 
    transform: translate(0, 0) rotate(180deg); 
  }
  20% { 
    transform: translate(-25vw, 10vh) rotate(210deg); 
  }
  40% { 
    transform: translate(-50vw, 5vh) rotate(240deg); 
  }
  60% { 
    transform: translate(-75vw, -5vh) rotate(270deg); 
  }
  80% { 
    transform: translate(-95vw, -10vh) rotate(300deg); 
  }
}

/* Plane 5: Wide loop, 55s */
.plane-5 {
  animation: wideloop-5 55s ease-in-out infinite;
  top: 50%;
  left: -10%;
}

@keyframes wideloop-5 {
  0%, 100% { 
    transform: translate(0, 0) rotate(0deg); 
  }
  16.67% { 
    transform: translate(20vw, -12vh) rotate(50deg); 
  }
  33.33% { 
    transform: translate(45vw, -18vh) rotate(100deg); 
  }
  50% { 
    transform: translate(70vw, -12vh) rotate(150deg); 
  }
  66.67% { 
    transform: translate(90vw, 0) rotate(200deg); 
  }
  83.33% { 
    transform: translate(105vw, 10vh) rotate(250deg); 
  }
}

/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .paper-plane {
    animation: none;
    opacity: 0.05;
    position: absolute;
  }
  
  .plane-1 { top: 20%; left: 10%; }
  .plane-2 { top: 45%; right: 15%; }
  .plane-3 { top: 65%; left: 20%; }
  .plane-4 { top: 30%; right: 25%; }
  .plane-5 { top: 55%; left: 40%; }
}
</style>
