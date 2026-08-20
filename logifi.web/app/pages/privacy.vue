<template>
  <div
    :class="[
      'min-h-screen transition-colors duration-300 font-quicksand',
      isFromLanding
        ? 'relative overflow-x-hidden bg-[#e4e8e7] text-gray-900'
        : 'bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-gray-100'
    ]"
  >
    <TechnicalTopographyBg v-if="isFromLanding" />
    <div :class="isFromLanding ? 'relative z-10' : 'contents'">
    <MarketingHeader v-if="isFromLanding" active-page="privacy" @open-auth="openAuth" />

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
      <div
        :class="[
          'max-w-4xl mx-auto prose prose-gray',
          isFromLanding
            ? 'relative overflow-hidden rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_0_42px_-12px_rgba(59,130,246,0.24),0_0_56px_-18px_rgba(37,99,235,0.14)] p-6 sm:p-8 lg:px-10 lg:pt-10 lg:pb-8'
            : '',
        ]"
      >
        <p :class="['text-sm mb-8', isFromLanding ? 'text-gray-600 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400']">Effective: April 16, 2026 · Last updated: April 16, 2026</p>

        <h1 :class="['text-3xl font-bold font-quicksand mb-2', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">Privacy Policy</h1>
        <p :class="['mb-10', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-600 dark:text-gray-400']">This policy describes how Logifi collects, uses, and protects your information.</p>

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
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">6. Optional airline schedule connection</h2>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            If you connect FLICA, our servers store encrypted portal credentials associated with your
            Logifi account and use them only to retrieve your schedule for logbook import.
            We do not send those credentials to third-party AI providers.
          </p>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            To remove stored credentials, disconnect FLICA in Settings or on the Data sources page.
          </p>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            See also
            <NuxtLink to="/data-sources" class="text-blue-600 hover:underline dark:text-blue-400">Data sources &amp; third-party APIs</NuxtLink>.
          </p>
        </section>

        <section id="digifi" class="mb-10 scroll-mt-28">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">6a. Digifi (paper logbook scanning)</h2>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            If you use Digifi on Add Pages, you upload photos of your paper logbook. Our servers send those images to
            <strong :class="isFromLanding ? 'text-gray-950 dark:text-gray-900' : ''">Google Gemini</strong> to transcribe entries into the builder grid.
            You review and edit before importing. Scan images are retained for up to 24 hours in private storage, then deleted.
            Airline portal credentials are not sent to AI providers.
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
            Depending on where you live, you may have the right to access, correct, delete, or export your personal data, or to object to or restrict certain processing.
            To permanently delete your Logifi account and associated personal data, open the app or website, go to
            <strong>Settings → Account → Delete account</strong>, and confirm. Deletion is self-serve and does not require contacting support.
            For other privacy requests, contact us at
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

    <MarketingFooter v-if="isFromLanding" active-page="privacy" class="mt-12" />

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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from '#imports'
import AuthModal from '~/components/AuthModal.vue'
import MarketingFooter from '~/components/MarketingFooter.vue'
import MarketingHeader from '~/components/MarketingHeader.vue'
import TechnicalTopographyBg from '~/components/TechnicalTopographyBg.vue'

const route = useRoute()
const router = useRouter()
const { theme, isDark, applyDocumentTheme } = useTheme()

const isFromLanding = computed(() => route.query.from === 'landing')

/** Marketing shell stays light (matches home); restore saved theme when leaving. */
if (import.meta.client) {
  watch(isFromLanding, (val) => {
    if (val) applyDocumentTheme('light')
    else applyDocumentTheme(theme.value)
  }, { immediate: true })

  onBeforeUnmount(() => {
    applyDocumentTheme(theme.value)
  })
  watch([theme, isDark], () => {
    if (isFromLanding.value) applyDocumentTheme('light')
    else applyDocumentTheme(theme.value)
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
