<template>
  <MarketingSecondaryPageShell>
    <MarketingHeader active-page="integrations" @open-auth="openAuth" />

    <main class="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold text-gray-950 mb-4 drop-shadow-sm dark:text-gray-900">Integrations</h1>
      <p class="text-gray-800 mb-6 text-lg font-medium dark:text-gray-700">
        Logifi connects to external services for logbook import and paper-to-digital scanning.
      </p>

      <nav class="flex flex-wrap gap-3 mb-10 text-sm font-medium">
        <a href="#schedule" class="text-blue-600 hover:underline dark:text-blue-600">Airline schedule</a>
        <span class="text-gray-400">·</span>
        <a href="#gemini" class="text-blue-600 hover:underline dark:text-blue-600">Google Gemini (Digifi)</a>
      </nav>

      <!-- Airline schedule (FLICA) -->
      <section id="schedule" class="scroll-mt-28 mb-10">
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <h2 class="text-2xl font-bold text-gray-950 m-0 drop-shadow-sm dark:text-gray-900">Airline schedule import</h2>
          <AutofiBetaPill tone="marketing" />
        </div>
        <p class="text-gray-800 mb-6 text-lg font-medium dark:text-gray-700">
          {{ AUTOFI_BETA_LINE }} Connect your FLICA portal to preview and import scheduled flights.
        </p>

        <div
          class="relative overflow-hidden rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_0_42px_-12px_rgba(59,130,246,0.24),0_0_56px_-18px_rgba(37,99,235,0.14)] p-6 sm:p-8 lg:px-10 lg:pt-10 lg:pb-8"
        >
          <div class="prose prose-gray max-w-none text-gray-800 space-y-4 dark:text-gray-800">
            <h3 class="text-xl font-bold text-gray-950 font-quicksand mt-0 dark:text-gray-900">What this integration does</h3>
            <p class="text-lg leading-relaxed">
              After you connect FLICA in Settings, Logifi fetches schedule legs for the date range you choose.
              You review a preview (including optional duplicate warnings) before import. Imports are intended
              to be idempotent using stable flight identifiers. Other airlines are not supported yet.
            </p>
            <p class="text-lg leading-relaxed">
              This is for
              <strong class="text-gray-950 dark:text-gray-900">logbook record-keeping only</strong>. Logifi does not use schedule data for flight
              planning, dispatch, weather or NOTAM briefing, or any operational decision-making.
            </p>
            <p class="text-lg leading-relaxed">
              More detail on data handling:
              <NuxtLink to="/data-sources?from=landing" class="text-blue-600 font-bold hover:underline dark:text-blue-600">Data sources &amp; third-party APIs</NuxtLink>.
            </p>
          </div>
        </div>
      </section>

      <!-- Google Gemini (powers Digifi) -->
      <section id="gemini" class="scroll-mt-28">
        <h2 class="text-2xl font-bold text-gray-950 mb-4 drop-shadow-sm dark:text-gray-900">Google Gemini</h2>
        <p class="text-gray-800 mb-6 text-lg font-medium dark:text-gray-700">
          Logifi integrates with <strong class="text-gray-950 dark:text-gray-900">Google Gemini</strong> to power
          <strong class="text-gray-950 dark:text-gray-900">Digifi</strong>—our paper logbook scanning feature. Upload photos of handwritten pages; Gemini transcribes entries for you to review and import.
        </p>

        <div
          class="relative overflow-hidden rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_0_42px_-12px_rgba(59,130,246,0.24),0_0_56px_-18px_rgba(37,99,235,0.14)] p-6 sm:p-8 lg:px-10 lg:pt-10 lg:pb-8"
        >
          <div class="prose prose-gray max-w-none text-gray-800 space-y-4 dark:text-gray-800">
            <h3 class="text-xl font-bold text-gray-950 font-quicksand mt-0 dark:text-gray-900">What this integration does</h3>
            <p class="text-lg leading-relaxed">
              When you use Digifi, Logifi sends your logbook scan images and extracted text to
              <strong class="text-gray-950 dark:text-gray-900">Google Gemini</strong> for transcription into your logbook grid.
              You review and edit before importing into your digital logbook.
            </p>
            <p class="text-lg leading-relaxed">
              Scan images are stored in our private storage bucket for up to
              <strong class="text-gray-950 dark:text-gray-900">24 hours</strong> (for support), then deleted.
              We do not send airline portal credentials or schedule tokens to Gemini or any other AI provider.
            </p>
            <p class="text-lg leading-relaxed">
              Digifi scanning uses a pay-per-spread credit model. Every account includes
              <strong class="text-gray-950 dark:text-gray-900">10 free Digifi spreads</strong> to get started—see
              <NuxtLink to="/pricing" class="text-blue-600 font-bold hover:underline dark:text-blue-600">Pricing</NuxtLink>
              for additional rates. Purchase more credits in Settings → Account after signing in.
            </p>
            <p class="text-lg leading-relaxed">
              More detail on data handling:
              <NuxtLink to="/data-sources?from=landing" class="text-blue-600 font-bold hover:underline dark:text-blue-600">Data sources &amp; third-party APIs</NuxtLink>
              and our
              <NuxtLink to="/privacy?from=landing#digifi" class="text-blue-600 font-bold hover:underline dark:text-blue-600">Privacy Policy (Digifi)</NuxtLink>.
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

/** Marketing shell stays light (matches home); restore saved theme when leaving. */
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
