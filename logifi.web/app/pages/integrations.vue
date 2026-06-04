<template>
  <MarketingSecondaryPageShell>
    <header
      class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/10 bg-white/5 backdrop-blur-md"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div class="flex items-center">
          <NuxtLink to="/" class="flex items-center">
            <img src="/images/logifi-logo.png" alt="Logifi" class="h-32 w-auto brightness-0" />
          </NuxtLink>
        </div>

        <nav class="hidden md:flex items-center space-x-8">
          <NuxtLink to="/#features" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Features</NuxtLink>
          <NuxtLink to="/integrations" class="text-sm font-medium text-blue-600 transition-colors dark:text-blue-600">Integrations</NuxtLink>
          <NuxtLink to="/pricing" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Pricing</NuxtLink>
          <NuxtLink to="/developers?from=landing" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Developers</NuxtLink>
          <NuxtLink to="/feedback?from=landing" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Feedback</NuxtLink>
          <div class="h-4 w-px bg-gray-200 dark:bg-gray-200"></div>
          <button
            type="button"
            class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600"
            @click="openAuth('signin')"
          >
            Sign In
          </button>
          <button
            type="button"
            class="btn-cta-primary px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all ring-1 ring-blue-400/60 shadow-[0_0_16px_-3px_rgba(37,99,235,0.48),0_0_32px_-12px_rgba(59,130,246,0.22)] hover:shadow-[0_0_24px_-2px_rgba(37,99,235,0.55),0_0_40px_-10px_rgba(59,130,246,0.28)] active:scale-[0.98] dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
            @click="openAuth('signup')"
          >
            <span class="relative z-10">Get Started</span>
          </button>
        </nav>

        <button type="button" class="md:hidden p-2 text-gray-600 dark:text-gray-600" aria-label="Open menu">
          <Icon name="ri:menu-line" size="24" />
        </button>
      </div>
    </header>

    <main class="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold text-gray-950 mb-4 drop-shadow-sm dark:text-gray-900">Integrations</h1>
      <p class="text-gray-800 mb-6 text-lg font-medium dark:text-gray-700">
        Logifi connects to external services for logbook import and paper-to-digital scanning.
      </p>

      <nav class="flex flex-wrap gap-3 mb-10 text-sm font-medium">
        <a href="#fcv" class="text-blue-600 hover:underline dark:text-blue-600">Flight Crew View</a>
        <span class="text-gray-400">·</span>
        <a href="#gemini" class="text-blue-600 hover:underline dark:text-blue-600">Google Gemini (Digifi)</a>
      </nav>

      <!-- Flight Crew View -->
      <section id="fcv" class="scroll-mt-28 mb-10">
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <h2 class="text-2xl font-bold text-gray-950 m-0 drop-shadow-sm dark:text-gray-900">Flight Crew View Import</h2>
          <span
            v-if="fcvUiShowPill"
            class="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900"
          >
            {{ fcvUiPillText }}
          </span>
        </div>
        <p class="text-gray-800 mb-6 text-lg font-medium dark:text-gray-700">
          Logifi can connect to Flight Crew View so you can preview and import your FC View flight
          history into your logbook (when the integration is enabled for your account).
        </p>

        <div
          class="relative overflow-hidden rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_0_42px_-12px_rgba(59,130,246,0.24),0_0_56px_-18px_rgba(37,99,235,0.14)] p-6 sm:p-8 lg:px-10 lg:pt-10 lg:pb-8"
        >
          <FcvApiDisclaimers class="not-prose mb-8" tone="marketing" />
          <div class="prose prose-gray max-w-none text-gray-800 space-y-4 dark:text-gray-800">
            <h3 class="text-xl font-bold text-gray-950 font-quicksand mt-0 dark:text-gray-900">What this integration does</h3>
            <p class="text-lg leading-relaxed">
              After you authorize Logifi with Flight Crew View, our servers fetch flights you choose by
              date range. You review a preview (including optional duplicate warnings) before import.
              Imports are intended to be idempotent using stable flight identifiers from FC View.
            </p>
            <p class="text-lg leading-relaxed">
              This is for
              <strong class="text-gray-950 dark:text-gray-900">logbook record-keeping only</strong>. Logifi does not use FC View data for flight
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
              We do not send FC View tokens, authorization codes, or passkeys to Gemini or any other AI provider.
            </p>
            <p class="text-lg leading-relaxed">
              Digifi scanning uses a pay-per-spread credit model—see
              <NuxtLink to="/pricing" class="text-blue-600 font-bold hover:underline dark:text-blue-600">Pricing</NuxtLink>
              for rates. Purchase credits in Settings → Account after signing in.
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

    <footer class="border-t border-white/10 bg-white/5 backdrop-blur-md pb-6 pt-2 mt-12 transition-colors duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 text-center">
        <p class="text-sm font-medium text-gray-600 dark:text-gray-600">
          <NuxtLink to="/integrations" class="text-blue-600 transition-colors dark:text-blue-600">Integrations</NuxtLink>
          <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
          <NuxtLink to="/pricing" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Pricing</NuxtLink>
          <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
          <NuxtLink to="/data-sources?from=landing" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Data sources</NuxtLink>
          <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
          <NuxtLink to="/terms?from=landing" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Terms of Service</NuxtLink>
          <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
          <NuxtLink to="/privacy?from=landing" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Privacy Policy</NuxtLink>
        </p>
      </div>
    </footer>

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
import FcvApiDisclaimers from '~/components/fcv/FcvApiDisclaimers.vue'
import { useFcvUiLabel } from '~/composables/useFcvUiLabel'
import AuthModal from '~/components/AuthModal.vue'
import MarketingSecondaryPageShell from '~/components/MarketingSecondaryPageShell.vue'

const { showPill: fcvUiShowPill, pillText: fcvUiPillText } = useFcvUiLabel()
const { theme, applyDocumentTheme } = useTheme()

if (import.meta.client) {
  applyDocumentTheme('light')
  onBeforeUnmount(() => {
    applyDocumentTheme(theme.value)
  })
  watch(theme, () => {
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
        'Logifi integrations: Flight Crew View logbook import and Google Gemini for Digifi paper scanning.',
    },
  ],
})
</script>

<style>
@keyframes cta-shimmer {
  0%,
  100% {
    transform: translateX(-140%) skewX(-14deg);
  }
  50% {
    transform: translateX(140%) skewX(-14deg);
  }
}

.btn-cta-primary {
  position: relative;
  overflow: hidden;
}

.btn-cta-primary::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(
    105deg,
    transparent 38%,
    rgba(255, 255, 255, 0.12) 50%,
    transparent 62%
  );
  animation: cta-shimmer 3.2s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .btn-cta-primary::after {
    animation: none;
    opacity: 0;
  }
}
</style>
