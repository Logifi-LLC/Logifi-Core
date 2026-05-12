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
        <p :class="['text-sm mb-8', isFromLanding ? 'text-gray-600 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400']">Effective: February 21, 2025 · Last updated: February 21, 2025</p>

        <h1 :class="['text-3xl font-bold font-quicksand mb-2', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">Terms of Service</h1>
        <p :class="['mb-10', isFromLanding ? 'text-gray-800 dark:text-gray-700' : 'text-gray-600 dark:text-gray-400']">Please read these terms carefully before using Logifi.</p>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">1. Acceptance</h2>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            By accessing or using Logifi ("Service"), you agree to be bound by these Terms of Service and our
            <NuxtLink to="/privacy" class="text-blue-600 hover:underline dark:text-blue-400">Privacy Policy</NuxtLink>. If you do not agree, do not use the Service.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">2. Description of Service</h2>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            Logifi is a digital flight logbook and related features designed to help pilots maintain FAA-compliant records. We may add, change, or discontinue features with notice where appropriate.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">3. Account and Eligibility</h2>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            You must provide accurate information when creating an account. You are responsible for keeping your account credentials secure and for all activity under your account.
          </p>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            You must be at least 13 years of age (or the minimum age in your jurisdiction) to use the Service.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">4. Use of Service</h2>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            You agree to use the Service only for lawful purposes and in accordance with these Terms. You may not misuse the Service, attempt to gain unauthorized access to our systems or other users' data, or use the Service in any way that could harm us or others.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">5. Data and Analytics</h2>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            We may use aggregated, de-identified data (as described in our
            <NuxtLink to="/privacy" class="text-blue-600 hover:underline dark:text-blue-400">Privacy Policy</NuxtLink>) for product improvement and to provide industry insights to partners and other companies. By using the Service, you accept this use.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">6. Fees and Payment</h2>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            Currently the Service is free during beta. Any future fees will be described at the point of purchase. By subscribing or purchasing, you agree to the pricing and payment terms presented at that time.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">7. Termination</h2>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            You may stop using the Service at any time. We may suspend or terminate your access if you breach these Terms or for other operational or legal reasons.
          </p>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            Upon termination, you may export your data as provided in the Service. We may retain data as described in our Privacy Policy.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">8. Disclaimers</h2>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS. YOU USE THE SERVICE AT YOUR OWN RISK.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">9. Limitation of Liability</h2>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, LOGIFI (AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS) SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS BEFORE THE CLAIM AROSE, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">10. Governing Law and Disputes</h2>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            These Terms are governed by the laws of the United States and the State of Delaware, without regard to conflict of law principles. Any dispute arising from these Terms or the Service shall be resolved in the courts located in Delaware.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">11. Changes</h2>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            We may update these Terms from time to time. We will post the updated Terms on this page and update the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the revised Terms.
          </p>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            For material changes, we will notify you by email or through the Service where reasonably possible.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">12. Third-party logbook import (Flight Crew View)</h2>
          <p :class="['leading-relaxed mb-3', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            Logifi may offer an optional connection to Flight Crew View to import your flight history
            into your logbook. The following notices are required by the Flight Crew View Logbook API
            Access Policy and are reproduced verbatim:
          </p>
          <FcvApiDisclaimers class="not-prose mb-4" tone="marketing" />
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            Additional detail:
            <NuxtLink to="/data-sources" class="text-blue-600 hover:underline dark:text-blue-400">Data sources &amp; third-party APIs</NuxtLink>.
          </p>
        </section>

        <section class="mb-10">
          <h2 :class="['text-xl font-bold font-quicksand mb-3', isFromLanding ? 'text-gray-950 dark:text-gray-900' : 'text-gray-900 dark:text-white']">13. Contact</h2>
          <p :class="['leading-relaxed', isFromLanding ? 'text-gray-800 dark:text-gray-800' : 'text-gray-700 dark:text-gray-300']">
            Questions about these Terms? Contact us at
            <a href="mailto:info@logifi.io" class="text-blue-600 hover:underline dark:text-blue-400">info@logifi.io</a>.
          </p>
        </section>

        <!-- Footer -->
        <div v-if="!isFromLanding" class="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500 dark:border-gray-800">
          <NuxtLink to="/privacy" class="text-blue-600 hover:underline dark:text-blue-400">Privacy Policy</NuxtLink>
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
          <NuxtLink to="/terms?from=landing" class="text-blue-600 transition-colors dark:text-blue-600">Terms of Service</NuxtLink>
          <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
          <NuxtLink to="/privacy?from=landing" class="hover:text-blue-600 transition-colors dark:hover:text-blue-600">Privacy Policy</NuxtLink>
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
import FcvApiDisclaimers from '~/components/fcv/FcvApiDisclaimers.vue'
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
  title: 'Terms of Service',
  meta: [{ name: 'description', content: 'Terms of Service for Logifi.' }],
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
