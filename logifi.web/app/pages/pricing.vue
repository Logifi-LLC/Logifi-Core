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
        Logifi is free while we’re in beta. FC View integration requires a separate Flight Crew View
        subscription—see
        <NuxtLink to="/integrations" class="text-blue-600 hover:underline">Integrations</NuxtLink>
        for details.
      </p>

      <div class="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <p class="text-sm font-semibold uppercase tracking-wide text-gray-500">Logifi</p>
          <p class="mt-2 text-4xl font-bold text-gray-900">$0</p>
          <p class="text-gray-600 mt-1">No charge for the core logbook during public beta.</p>
        </div>
        <p class="text-sm text-gray-700 leading-relaxed">
          If we add paid plans later, we’ll show price, billing, renewals, trials, how to cancel, and
          refunds before you pay—same idea as in our
          <NuxtLink to="/terms" class="text-blue-600 hover:underline">Terms</NuxtLink>.
        </p>

        <FcvApiDisclaimers class="mt-2" tone="marketing" />
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
      content: 'Logifi is free during beta. FC View sold separately.',
    },
  ],
})
</script>
