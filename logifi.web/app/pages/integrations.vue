<template>
  <MarketingSecondaryPageShell>
    <MarketingHeader active-page="integrations" @open-auth="openAuth" />

    <main class="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold text-gray-100 mb-4">Integrations</h1>
      <p class="text-gray-400 mb-6 text-lg font-medium">
        Logifi connects to external services for logbook import and paper-to-digital scanning.
      </p>

      <nav class="flex flex-wrap gap-3 mb-10 text-sm font-medium">
        <a href="#schedule" class="text-blue-400 hover:text-blue-300 transition-colors">Airline schedule</a>
        <span class="text-gray-600">·</span>
        <a href="#gemini" class="text-blue-400 hover:text-blue-300 transition-colors">Google Gemini (Digifi)</a>
      </nav>

      <!-- Airline schedule (FLICA) -->
      <section id="schedule" class="scroll-mt-28 mb-10">
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <h2 class="text-2xl font-bold text-gray-100 m-0">Airline schedule import</h2>
          <AutofiBetaPill tone="marketing" />
        </div>
        <p class="text-gray-400 mb-6 text-lg font-medium">
          {{ AUTOFI_BETA_LINE }} Connect your FLICA portal to preview and import scheduled flights.
        </p>

        <div
          class="relative overflow-hidden rounded-xl border border-gray-800/50 bg-gray-900/40 backdrop-blur-sm shadow-lg p-6 sm:p-8 lg:px-10 lg:pt-10 lg:pb-8"
        >
          <div class="prose prose-invert max-w-none text-gray-300 space-y-4">
            <p class="text-lg leading-relaxed">
              After you connect FLICA in Settings, Logifi fetches schedule legs for the date range you choose.
              You review a preview (including optional duplicate warnings) before import.
            </p>
            <p class="text-lg leading-relaxed">
              This is for <strong class="text-gray-100">logbook record-keeping only</strong>. Logifi does not use schedule data for flight planning, dispatch, weather or NOTAM briefing, or any operational decision-making.
            </p>
            <p class="text-lg leading-relaxed">
              More detail: <NuxtLink to="/data-sources?from=landing" class="text-blue-400 font-bold hover:text-blue-300 transition-colors">Data sources &amp; third-party APIs</NuxtLink>.
            </p>
          </div>
        </div>
      </section>

      <!-- Google Gemini (powers Digifi) -->
      <section id="gemini" class="scroll-mt-28">
        <h2 class="text-2xl font-bold text-gray-100 mb-4">Google Gemini</h2>
        <p class="text-gray-400 mb-6 text-lg font-medium">
          Logifi integrates with <strong class="text-gray-100">Google Gemini</strong> to power
          <strong class="text-gray-100">Digifi</strong>—our paper logbook scanning feature. Upload photos of handwritten pages; Gemini transcribes entries for you to review and import.
        </p>

        <div
          class="relative overflow-hidden rounded-xl border border-gray-800/50 bg-gray-900/40 backdrop-blur-sm shadow-lg p-6 sm:p-8 lg:px-10 lg:pt-10 lg:pb-8"
        >
          <div class="prose prose-invert max-w-none text-gray-300 space-y-4">
            <p class="text-lg leading-relaxed">
              Logifi sends your logbook scan images to <strong class="text-gray-100">Google Gemini</strong> for transcription.
              You review and edit before importing.
            </p>
            <p class="text-lg leading-relaxed">
              Scan images are stored in our private storage bucket for up to <strong class="text-gray-100">24 hours</strong> (for support), then deleted.
              We do not send airline portal credentials or schedule tokens to Gemini or any other AI provider.
            </p>
            <p class="text-lg leading-relaxed">
              Digifi uses a pay-per-spread credit model. Every account includes <strong class="text-gray-100">10 free Digifi spreads</strong> to get started—see
              <NuxtLink to="/pricing" class="text-blue-400 font-bold hover:text-blue-300 transition-colors">Pricing</NuxtLink>
              for additional rates.
            </p>
            <p class="text-lg leading-relaxed">
              More detail: <NuxtLink to="/data-sources?from=landing" class="text-blue-400 font-bold hover:text-blue-300 transition-colors">Data sources &amp; third-party APIs</NuxtLink>
              and our <NuxtLink to="/privacy?from=landing#digifi" class="text-blue-400 font-bold hover:text-blue-300 transition-colors">Privacy Policy</NuxtLink>.
            </p>
          </div>
        </div>
      </section>
    </main>

    <MarketingFooter active-page="integrations" class="mt-12" />

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
import AutofiBetaPill from '~/components/fcv/AutofiBetaPill.vue'
import MarketingFooter from '~/components/MarketingFooter.vue'
import MarketingHeader from '~/components/MarketingHeader.vue'
import MarketingSecondaryPageShell from '~/components/MarketingSecondaryPageShell.vue'
import { AUTOFI_BETA_LINE } from '~/utils/autofiBeta'

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
  title: 'Integrations | Logifi',
  meta: [
    {
      name: 'description',
      content:
        'Logifi integrations: Autofi FLICA import (public beta with Republic / RJET) and Google Gemini for Digifi paper scanning.',
    },
  ],
})
</script>
