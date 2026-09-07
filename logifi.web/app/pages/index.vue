<template>
  <!-- Force light theme on landing: dark: overrides so links/header stay light even when app uses dark mode -->
  <div class="min-h-screen bg-[#0a0e1a] font-quicksand text-gray-100 overflow-x-hidden dark:bg-[#0a0e1a] dark:text-gray-100">
    <MarketingHeader active-page="home" :logo-href="null" @open-auth="openAuth" />

    <!-- Hero Section -->
    <main>
      <section class="relative pt-32 pb-20 lg:pt-48 lg:pb-28 overflow-hidden">
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
            Logifi is built for 121 CA/FO flying — pairings, legs, and hours that match the job. Not a student kitchen sink.
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
