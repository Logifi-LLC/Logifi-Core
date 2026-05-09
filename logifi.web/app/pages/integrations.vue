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
          <NuxtLink to="/pricing" class="hover:text-blue-600">Pricing</NuxtLink>
          <NuxtLink to="/" class="hover:text-blue-600">Home</NuxtLink>
        </nav>
      </div>
    </header>

    <main class="pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <div class="flex flex-wrap items-center gap-3 mb-2">
        <h1 class="text-3xl font-bold text-gray-900 m-0">Flight Crew View Import</h1>
        <span
          v-if="fcvUiShowPill"
          class="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900"
        >
          {{ fcvUiPillText }}
        </span>
      </div>
      <p class="text-gray-600 mb-6 text-lg">
        Logifi can connect to Flight Crew View so you can preview and import your FC View flight
        history into your logbook (when the integration is enabled for your account).
      </p>

      <FcvApiDisclaimers class="mb-10" tone="marketing" />

      <div class="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <section class="prose prose-gray max-w-none text-gray-700 space-y-4">
          <h2 class="text-xl font-bold text-gray-900 font-quicksand mt-0">What this integration does</h2>
          <p>
            After you authorize Logifi with Flight Crew View, our servers fetch flights you choose by
            date range. You review a preview (including optional duplicate warnings) before import.
            Imports are intended to be idempotent using stable flight identifiers from FC View.
          </p>
          <p>
            This is for
            <strong>logbook record-keeping only</strong>. Logifi does not use FC View data for flight
            planning, dispatch, weather or NOTAM briefing, or any operational decision-making.
          </p>
          <p>
            More detail on data handling:
            <NuxtLink to="/data-sources" class="text-blue-600 font-medium hover:underline">Data sources &amp; third-party APIs</NuxtLink>.
          </p>
        </section>
      </div>

      <footer class="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
        <NuxtLink to="/terms" class="text-blue-600 hover:underline">Terms</NuxtLink>
        <span class="mx-2">·</span>
        <NuxtLink to="/privacy" class="text-blue-600 hover:underline">Privacy</NuxtLink>
        <span class="mx-2">·</span>
        <NuxtLink to="/pricing" class="text-blue-600 hover:underline">Pricing</NuxtLink>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import FcvApiDisclaimers from '~/components/fcv/FcvApiDisclaimers.vue'
import { useFcvUiLabel } from '~/composables/useFcvUiLabel'

const { showPill: fcvUiShowPill, pillText: fcvUiPillText } = useFcvUiLabel()

useHead({
  title: 'Flight Crew View integration | Logifi',
  meta: [
    {
      name: 'description',
      content:
        'How Logifi connects to Flight Crew View for logbook import. Required FCV API disclaimers.',
    },
  ],
})
</script>
