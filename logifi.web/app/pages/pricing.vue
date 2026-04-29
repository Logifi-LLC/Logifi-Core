<template>
  <div class="min-h-screen bg-[#e4e8e7] font-quicksand text-gray-900">
    <header
      class="fixed top-0 left-0 right-0 z-50 border-b bg-white/80 backdrop-blur-md border-[#e4e8e7]"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center">
          <img src="/images/logifi-logo.png" alt="Logifi" class="h-32 w-auto brightness-0" />
        </NuxtLink>
        <nav class="flex items-center gap-4 text-sm font-medium text-gray-600">
          <NuxtLink to="/integrations" class="hover:text-blue-600">Integrations</NuxtLink>
          <NuxtLink to="/" class="hover:text-blue-600">Home</NuxtLink>
        </nav>
      </div>
    </header>

    <main class="pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Pricing</h1>
      <p class="text-gray-600 mb-6">
        Clear pricing for Logifi. (FC View requires its own subscription from Flight Crew View.)
      </p>

      <div class="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <p class="text-sm font-semibold uppercase tracking-wide text-gray-500">Logifi</p>
          <p class="mt-2 text-4xl font-bold text-gray-900">$0</p>
          <p class="text-gray-600 mt-1">During public beta there is no charge to use the core logbook.</p>
        </div>
        <ul class="text-sm text-gray-700 space-y-2 list-disc pl-5">
          <li><strong>Billing interval:</strong> Not applicable while the Service is free.</li>
          <li>
            <strong>Auto-renew:</strong> If paid plans are introduced later, subscription terms will be
            shown at checkout; you will not be charged without agreeing to those terms.
          </li>
          <li>
            <strong>Trials:</strong> Not applicable while the Service is free. Any future trial will
            state its length and what happens when it ends.
          </li>
          <li>
            <strong>Cancellation:</strong> You may stop using the Service at any time. If we offer
            paid subscriptions, cancellation will be available in-account without requiring a phone
            call.
          </li>
          <li>
            <strong>Refunds:</strong> If we sell a paid product, we will publish a refund policy before
            taking payment. During the free beta, there are no payments to refund.
          </li>
        </ul>

        <FcvApiDisclaimers class="mt-8" tone="marketing" />
      </div>

      <footer class="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
        <NuxtLink to="/terms" class="text-blue-600 hover:underline">Terms</NuxtLink>
        <span class="mx-2">·</span>
        <NuxtLink to="/privacy" class="text-blue-600 hover:underline">Privacy</NuxtLink>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import FcvApiDisclaimers from '~/components/fcv/FcvApiDisclaimers.vue'

useHead({
  title: 'Pricing | Logifi',
  meta: [
    {
      name: 'description',
      content: 'Logifi pricing and billing transparency. Free during beta.',
    },
  ],
})
</script>
