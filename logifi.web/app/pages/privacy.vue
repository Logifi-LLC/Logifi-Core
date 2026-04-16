<template>
  <div class="min-h-screen bg-gray-100 font-quicksand text-gray-900">
    <!-- Header -->
    <header class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b bg-white/80 backdrop-blur-md border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <img src="/images/logifi-logo.png" alt="Logifi" class="h-32 w-auto brightness-0" />
        </NuxtLink>
        <button
          type="button"
          @click="goBack"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          <Icon name="ri:arrow-left-line" size="18" />
          {{ backButtonText }}
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto prose prose-gray">
        <p class="text-sm text-gray-500 mb-8">Effective: April 16, 2026 · Last updated: April 16, 2026</p>

        <h1 class="text-3xl font-bold font-quicksand text-gray-900 mb-2">Privacy Policy</h1>
        <p class="text-gray-600 mb-10">This policy describes how Logifi collects, uses, and protects your information.</p>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">1. Who We Are</h2>
          <p class="text-gray-700 leading-relaxed">
            Logifi is operated by Logifi LLC. For privacy questions, contact us at
            <a href="mailto:info@logifi.io" class="text-blue-600 hover:underline">info@logifi.io</a>.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">2. What We Collect</h2>
          <p class="text-gray-700 leading-relaxed mb-3">
            We collect information you provide when you create an account (such as email address and, if you choose, name), and the flight log and related data you enter into the Service (flights, aircraft, times, etc.). We may also collect device and usage information (e.g., browser type, how you use the app) to operate and improve the Service.
          </p>
          <p class="text-gray-700 leading-relaxed">
            We use Supabase for authentication and to store your account and logbook data in the cloud. Supabase's handling of data is governed by their own privacy and security practices.
          </p>
          <p class="text-gray-700 leading-relaxed">
            When you use our website, we collect analytics data (e.g., page views, performance metrics) through our hosting provider Vercel (Vercel Analytics). This helps us understand how the Service is used and improve it. See Section 9 for more on cookies and analytics.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">3. How We Use It</h2>
          <p class="text-gray-700 leading-relaxed">
            We use your information to provide, secure, and improve the Service; to communicate with you about your account or the Service; and as described below regarding aggregated and de-identified data.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">4. Aggregated and De-Identified Data</h2>
          <p class="text-gray-700 leading-relaxed mb-3">
            We may create <strong>aggregated and de-identified</strong> data from logbook and usage data (e.g., flight hours, aircraft types, routes, dates, patterns). This data <strong>does not include names, email addresses, or other direct identifiers</strong> and is not reasonably capable of identifying you.
          </p>
          <p class="text-gray-700 leading-relaxed">
            We may use and share this aggregated, de-identified data to help other companies (e.g., insurers, training providers, industry analysts) make informed decisions and for industry insights. By using the Service, you consent to this use.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">5. Who We Share Data With</h2>
          <p class="text-gray-700 leading-relaxed">
            We share data with Supabase (and their subprocessors) as necessary to provide the Service. We use Vercel for hosting and analytics; analytics data (e.g., page views, performance metrics) is processed by Vercel in accordance with their privacy policy. We may share aggregated, de-identified data as described in Section 4. We do not sell your personal information. We may disclose information if required by law or to protect our rights, safety, or property.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">6. Optional Flight Crew View connection</h2>
          <p class="text-gray-700 leading-relaxed mb-3">
            If you connect Flight Crew View, OAuth completes on FC View’s systems. Our servers exchange
            the authorization code for access and refresh tokens and store them in our database for
            your Logifi account. Tokens are used only to retrieve your flight history for logbook
            import. We do not send FC View tokens or authorization codes to third-party AI providers.
          </p>
          <p class="text-gray-700 leading-relaxed mb-3">
            We do not collect your FC View password or passkey. To request removal of stored FC View
            tokens, you can disconnect your account directly within the Logifi app (see Data sources).
          </p>
          <p class="text-gray-700 leading-relaxed">
            See also
            <NuxtLink to="/data-sources" class="text-blue-600 hover:underline">Data sources &amp; third-party APIs</NuxtLink>.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">7. Retention</h2>
          <p class="text-gray-700 leading-relaxed">
            We retain your account and logbook data for as long as your account is active and as needed to provide the Service and comply with legal obligations. If you delete your account, we will delete or anonymize your personal data in accordance with our internal policies. Aggregated, de-identified data may be retained for longer periods.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">8. Security</h2>
          <p class="text-gray-700 leading-relaxed">
            We use reasonable technical and organizational measures to protect your data against unauthorized access, loss, or alteration. No method of transmission or storage is 100% secure; we cannot guarantee absolute security.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">9. Your Rights</h2>
          <p class="text-gray-700 leading-relaxed mb-3">
            Depending on where you live, you may have the right to access, correct, delete, or export your personal data, or to object to or restrict certain processing. You can often manage your account and data through the Service; for other requests, contact us at
            <a href="mailto:info@logifi.io" class="text-blue-600 hover:underline">info@logifi.io</a>.
          </p>
          <p class="text-gray-700 leading-relaxed">
            If you are in the European Economic Area or the UK, you may have additional rights under applicable data protection laws, including the right to lodge a complaint with a supervisory authority.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">10. Cookies and Similar Technologies</h2>
          <p class="text-gray-700 leading-relaxed mb-3">
            We use essential and session-related cookies and similar technologies necessary to operate the Service (e.g., authentication). We also use Vercel Analytics to collect usage data (e.g., page views, Web Vitals) to understand how the Service is used and to improve performance. Vercel Analytics is designed to be privacy-friendly and may use first-party cookies or similar technologies; you can learn more at Vercel's privacy documentation. If we add additional analytics or non-essential technologies in the future, we will update this policy and, where required by law, obtain your consent.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">11. Changes</h2>
          <p class="text-gray-700 leading-relaxed mb-3">
            We may update this Privacy Policy from time to time. We will post the updated policy on this page and update the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the revised policy.
          </p>
          <p class="text-gray-700 leading-relaxed">
            For material changes that affect how we use your personal data, we will notify you by email or through the Service where reasonably possible.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">12. Contact</h2>
          <p class="text-gray-700 leading-relaxed">
            Questions about privacy or this policy? Contact us at
            <a href="mailto:info@logifi.io" class="text-blue-600 hover:underline">info@logifi.io</a>.
          </p>
        </section>

        <!-- Footer -->
        <div class="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <NuxtLink to="/terms" class="text-blue-600 hover:underline">Terms of Service</NuxtLink>
          <span class="mx-2">·</span>
          <NuxtLink to="/" class="text-blue-600 hover:underline">Home</NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from '#imports'

const route = useRoute()
const router = useRouter()

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
