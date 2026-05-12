<template>
  <div
    :class="[
      'min-h-screen transition-colors duration-300 font-quicksand',
      isFromLanding
        ? 'bg-[#e4e8e7] text-gray-900'
        : 'bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-gray-100'
    ]"
  >
    <!-- Marketing header (?from=landing) -->
    <header v-if="isFromLanding" class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/10 bg-white/5 backdrop-blur-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div class="flex items-center">
          <NuxtLink to="/" class="flex items-center">
            <img src="/images/logifi-logo.png" alt="Logifi" class="h-32 w-auto brightness-0" />
          </NuxtLink>
        </div>
        
        <nav class="hidden md:flex items-center space-x-8">
          <NuxtLink to="/#features" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Features</NuxtLink>
          <NuxtLink to="/integrations" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Integrations</NuxtLink>
          <NuxtLink to="/pricing" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Pricing</NuxtLink>
          <NuxtLink to="/developers?from=landing" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Developers</NuxtLink>
          <NuxtLink to="/feedback?from=landing" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600">Feedback</NuxtLink>
          <div class="h-4 w-px bg-gray-200 dark:bg-gray-200"></div>
          <button 
            @click="openAuth('signin')"
            class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-600 dark:hover:text-blue-600"
          >
            Sign In
          </button>
          <button 
            @click="openAuth('signup')"
            class="btn-cta-primary px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all ring-1 ring-blue-400/60 shadow-[0_0_16px_-3px_rgba(37,99,235,0.48),0_0_32px_-12px_rgba(59,130,246,0.22)] hover:shadow-[0_0_24px_-2px_rgba(37,99,235,0.55),0_0_40px_-10px_rgba(59,130,246,0.28)] active:scale-[0.98] dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
          >
            <span class="relative z-10">Get Started</span>
          </button>
        </nav>

        <!-- Mobile Menu Button -->
        <button class="md:hidden p-2 text-gray-600 dark:text-gray-600">
          <Icon name="ri:menu-line" size="24" />
        </button>
      </div>
    </header>

    <!-- App header (dashboard / default) -->
    <header v-else class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/10 bg-white/5 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors dark:text-gray-300 dark:hover:text-white">
          <img src="/images/logifi-logo.png" alt="Logifi" class="h-32 w-auto brightness-0 dark:invert" />
        </NuxtLink>
        <button
          type="button"
          @click="goBack"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
        >
          <Icon name="ri:arrow-left-line" size="18" />
          {{ backButtonText }}
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main :class="['pb-16 px-4 sm:px-6 lg:px-8', isFromLanding ? 'pt-32' : 'pt-24']">
      <div :class="['max-w-4xl mx-auto prose prose-gray', isFromLanding ? 'relative overflow-hidden rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_0_42px_-12px_rgba(59,130,246,0.24),0_0_56px_-18px_rgba(37,99,235,0.14)] p-6 sm:p-8 lg:px-10 lg:pt-10 lg:pb-8' : '']">
        <p :class="['text-sm mb-8', isFromLanding ? 'text-gray-600 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400']">Effective: April 16, 2026 · Last updated: April 16, 2026</p>

        <h1 :class="['text-3xl font-bold font-quicksand mb-2', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">Privacy Policy</h1>
        <p :class="['mb-10', isFromLanding ? 'text-gray-800 dark:text-gray-700' : 'text-gray-600 dark:text-gray-400']">This policy describes how Logifi collects, uses, and protects your information.</p>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">1. Who We Are</h2>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            Logifi is operated by Logifi LLC. For privacy questions, contact us at
            <a href="mailto:info@logifi.io" class="text-blue-600 hover:underline dark:text-blue-400">info@logifi.io</a>.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">2. What We Collect</h2>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            We collect information you provide when you create an account (such as email address and, if you choose, name), and the flight log and related data you enter into the Service (flights, aircraft, times, etc.). We may also collect device and usage information (e.g., browser type, how you use the app) to operate and improve the Service.
          </p>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            We use Supabase for authentication and to store your account and logbook data in the cloud. Supabase's handling of data is governed by their own privacy and security practices.
          </p>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            When you use our website, we collect analytics data (e.g., page views, performance metrics) through our hosting provider Vercel (Vercel Analytics). This helps us understand how the Service is used and improve it. See Section 9 for more on cookies and analytics.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">3. How We Use It</h2>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            We use your information to provide, secure, and improve the Service; to communicate with you about your account or the Service; and as described below regarding aggregated and de-identified data.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">4. Aggregated and De-Identified Data</h2>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            We may create <strong :class="isFromLanding ? 'text-gray-950 dark:text-gray-900' : ''">aggregated and de-identified</strong> data from logbook and usage data (e.g., flight hours, aircraft types, routes, dates, patterns). This data <strong :class="isFromLanding ? 'text-gray-950 dark:text-gray-900' : ''">does not include names, email addresses, or other direct identifiers</strong> and is not reasonably capable of identifying you.
          </p>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            We may use and share this aggregated, de-identified data to help other companies (e.g., insurers, training providers, industry analysts) make informed decisions and for industry insights. By using the Service, you consent to this use.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">5. Who We Share Data With</h2>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            We share data with Supabase (and their subprocessors) as necessary to provide the Service. We use Vercel for hosting and analytics; analytics data (e.g., page views, performance metrics) is processed by Vercel in accordance with their privacy policy. We may share aggregated, de-identified data as described in Section 4. We do not sell your personal information. We may disclose information if required by law or to protect our rights, safety, or property.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">6. Optional Flight Crew View connection</h2>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            If you connect Flight Crew View, OAuth completes on FC View’s systems. Our servers exchange
            the authorization code for access and refresh tokens and store them in our database for
            your Logifi account. Tokens are used only to retrieve your flight history for logbook
            import. We do not send FC View tokens or authorization codes to third-party AI providers.
          </p>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            We do not collect your FC View password or passkey. To request removal of stored FC View
            tokens, you can disconnect your account directly within the Logifi app (see Data sources).
          </p>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            See also
            <NuxtLink to="/data-sources" class="text-blue-600 hover:underline dark:text-blue-400">Data sources &amp; third-party APIs</NuxtLink>.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">7. Retention</h2>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            We retain your account and logbook data for as long as your account is active and as needed to provide the Service and comply with legal obligations. If you delete your account, we will delete or anonymize your personal data in accordance with our internal policies. Aggregated, de-identified data may be retained for longer periods.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">8. Security</h2>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            We use reasonable technical and organizational measures to protect your data against unauthorized access, loss, or alteration. No method of transmission or storage is 100% secure; we cannot guarantee absolute security.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">9. Your Rights</h2>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            Depending on where you live, you may have the right to access, correct, delete, or export your personal data, or to object to or restrict certain processing. You can often manage your account and data through the Service; for other requests, contact us at
            <a href="mailto:info@logifi.io" class="text-blue-600 hover:underline dark:text-blue-400">info@logifi.io</a>.
          </p>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            If you are in the European Economic Area or the UK, you may have additional rights under applicable data protection laws, including the right to lodge a complaint with a supervisory authority.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">10. Cookies and Similar Technologies</h2>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            We use essential and session-related cookies and similar technologies necessary to operate the Service (e.g., authentication). We also use Vercel Analytics to collect usage data (e.g., page views, Web Vitals) to understand how the Service is used and to improve performance. Vercel Analytics is designed to be privacy-friendly and may use first-party cookies or similar technologies; you can learn more at Vercel's privacy documentation. If we add additional analytics or non-essential technologies in the future, we will update this policy and, where required by law, obtain your consent.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">11. Changes</h2>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            We may update this Privacy Policy from time to time. We will post the updated policy on this page and update the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the revised policy.
          </p>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            For material changes that affect how we use your personal data, we will notify you by email or through the Service where reasonably possible.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">12. Contact</h2>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            Questions about privacy or this policy? Contact us at
            <a href="mailto:info@logifi.io" class="text-blue-600 hover:underline dark:text-blue-400">info@logifi.io</a>.
          </p>
        </section>

        <!-- Footer -->
        <div v-if="!isFromLanding" class="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500 dark:border-gray-800">
          <NuxtLink to="/terms" class="text-blue-600 hover:underline dark:text-blue-400">Terms of Service</NuxtLink>
          <span class="mx-2">·</span>
          <NuxtLink to="/" class="text-blue-600 hover:underline dark:text-blue-400">Home</NuxtLink>
        </div>
      </div>
    </main>

    <!-- Marketing Footer -->
    <footer v-if="isFromLanding" class="relative z-10 border-t border-white/10 bg-white/5 backdrop-blur-md pb-6 pt-2 mt-12 transition-colors duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 text-center">
        <p class="text-sm font-medium text-gray-600 dark:text-gray-600">
          <NuxtLink to="/integrations" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Integrations</NuxtLink>
          <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
          <NuxtLink to="/pricing" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Pricing</NuxtLink>
          <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
          <NuxtLink to="/data-sources?from=landing" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Data sources</NuxtLink>
          <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
          <NuxtLink to="/terms?from=landing" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Terms of Service</NuxtLink>
          <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
          <NuxtLink to="/privacy?from=landing" class="text-blue-600 transition-colors dark:text-blue-600">Privacy Policy</NuxtLink>
        </p>
      </div>
    </footer>

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
import { ref, computed, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from '#imports'
import AuthModal from '~/components/AuthModal.vue'

const route = useRoute()
const router = useRouter()
const { theme, applyDocumentTheme } = useTheme()

const isFromLanding = computed(() => route.query.from === 'landing')

/** Landing pages stay visually light and drop `html.dark` so `dark:` utilities do not apply. Restore saved theme when leaving. */
if (import.meta.client) {
  watch(isFromLanding, (val) => {
    if (val) applyDocumentTheme('light')
    else applyDocumentTheme(theme.value)
  }, { immediate: true })

  onBeforeUnmount(() => {
    applyDocumentTheme(theme.value)
  })
  watch(theme, (newTheme) => {
    if (isFromLanding.value) applyDocumentTheme('light')
    else applyDocumentTheme(newTheme)
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

const backTarget = computed(() => {
  const from = route.query.from
  if (from === 'landing') return '/'
  if (from === 'dashboard' || from === 'app') return '/dashboard'
  return '/dashboard'
})

const goBack = () => {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
  } else {
    router.push(backTarget.value)
  }
}

const backButtonText = computed(() => (route.query.from === 'landing' ? 'Back to Home' : 'Back to Logbook'))

useHead({
  title: 'Privacy Policy',
  meta: [{ name: 'description', content: 'Privacy Policy for Logifi.' }],
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
