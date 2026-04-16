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
        <p class="text-sm text-gray-500 mb-8">Effective: February 21, 2025 · Last updated: February 21, 2025</p>

        <h1 class="text-3xl font-bold font-quicksand text-gray-900 mb-2">Terms of Service</h1>
        <p class="text-gray-600 mb-10">Please read these terms carefully before using Logifi.</p>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">1. Acceptance</h2>
          <p class="text-gray-700 leading-relaxed">
            By accessing or using Logifi ("Service"), you agree to be bound by these Terms of Service and our
            <NuxtLink to="/privacy" class="text-blue-600 hover:underline">Privacy Policy</NuxtLink>. If you do not agree, do not use the Service.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">2. Description of Service</h2>
          <p class="text-gray-700 leading-relaxed">
            Logifi is a digital flight logbook and related features designed to help pilots maintain FAA-compliant records. We may add, change, or discontinue features with notice where appropriate.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">3. Account and Eligibility</h2>
          <p class="text-gray-700 leading-relaxed mb-3">
            You must provide accurate information when creating an account. You are responsible for keeping your account credentials secure and for all activity under your account.
          </p>
          <p class="text-gray-700 leading-relaxed">
            You must be at least 13 years of age (or the minimum age in your jurisdiction) to use the Service.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">4. Use of Service</h2>
          <p class="text-gray-700 leading-relaxed">
            You agree to use the Service only for lawful purposes and in accordance with these Terms. You may not misuse the Service, attempt to gain unauthorized access to our systems or other users' data, or use the Service in any way that could harm us or others.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">5. Data and Analytics</h2>
          <p class="text-gray-700 leading-relaxed">
            We may use aggregated, de-identified data (as described in our
            <NuxtLink to="/privacy" class="text-blue-600 hover:underline">Privacy Policy</NuxtLink>) for product improvement and to provide industry insights to partners and other companies. By using the Service, you accept this use.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">6. Fees and Payment</h2>
          <p class="text-gray-700 leading-relaxed">
            Currently the Service is free during beta. Any future fees will be described at the point of purchase. By subscribing or purchasing, you agree to the pricing and payment terms presented at that time.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">7. Termination</h2>
          <p class="text-gray-700 leading-relaxed mb-3">
            You may stop using the Service at any time. We may suspend or terminate your access if you breach these Terms or for other operational or legal reasons.
          </p>
          <p class="text-gray-700 leading-relaxed">
            Upon termination, you may export your data as provided in the Service. We may retain data as described in our Privacy Policy.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">8. Disclaimers</h2>
          <p class="text-gray-700 leading-relaxed">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS. YOU USE THE SERVICE AT YOUR OWN RISK.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">9. Limitation of Liability</h2>
          <p class="text-gray-700 leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, LOGIFI (AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS) SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS BEFORE THE CLAIM AROSE, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">10. Governing Law and Disputes</h2>
          <p class="text-gray-700 leading-relaxed">
            These Terms are governed by the laws of the United States and the State of Delaware, without regard to conflict of law principles. Any dispute arising from these Terms or the Service shall be resolved in the courts located in Delaware.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">11. Changes</h2>
          <p class="text-gray-700 leading-relaxed mb-3">
            We may update these Terms from time to time. We will post the updated Terms on this page and update the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the revised Terms.
          </p>
          <p class="text-gray-700 leading-relaxed">
            For material changes, we will notify you by email or through the Service where reasonably possible.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">12. Third-party logbook import (Flight Crew View)</h2>
          <p class="text-gray-700 leading-relaxed mb-3">
            Logifi may offer an optional connection to Flight Crew View to import your flight history
            into your logbook. The following notices are required by the Flight Crew View Logbook API
            Access Policy and are reproduced verbatim:
          </p>
          <div class="not-prose rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 space-y-2 mb-4">
            <p class="font-semibold">
              Uses the Flight Crew View Logbook API. Not affiliated with Flight Crew View.
            </p>
            <p>For logbook purposes only. Not for flight planning or operational use.</p>
            <p>Requires an active Flight Crew View subscription (sold separately).</p>
          </div>
          <p class="text-gray-700 leading-relaxed">
            Additional detail:
            <NuxtLink to="/data-sources" class="text-blue-600 hover:underline">Data sources &amp; third-party APIs</NuxtLink>.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-xl font-bold font-quicksand text-gray-900 mb-3">13. Contact</h2>
          <p class="text-gray-700 leading-relaxed">
            Questions about these Terms? Contact us at
            <a href="mailto:info@logifi.io" class="text-blue-600 hover:underline">info@logifi.io</a>.
          </p>
        </section>

        <!-- Footer -->
        <div class="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <NuxtLink to="/privacy" class="text-blue-600 hover:underline">Privacy Policy</NuxtLink>
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
  title: 'Terms of Service',
  meta: [{ name: 'description', content: 'Terms of Service for Logifi.' }],
})
</script>
