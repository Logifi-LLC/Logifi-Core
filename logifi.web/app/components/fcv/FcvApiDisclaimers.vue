<script setup lang="ts">
/**
 * FCV Logbook API Access Policy v1.1 — Section 5.1 required wording (verbatim).
 */
withDefaults(
  defineProps<{
    isDarkMode?: boolean
    /** Landing/legal pages: light neutral card. Dashboard: follows isDarkMode. */
    tone?: 'marketing' | 'dashboard'
  }>(),
  {
    isDarkMode: false,
    tone: 'dashboard',
  }
)
</script>

<template>
  <div
    :class="[
      'rounded-xl border p-3 sm:p-4 text-xs sm:text-sm space-y-2',
      tone === 'marketing'
        ? 'border-gray-200 bg-gray-50 text-gray-800'
        : isDarkMode
          ? 'border-gray-600 bg-gray-800/50 text-gray-200'
          : 'border-gray-200 bg-amber-50/90 text-gray-900',
    ]"
    role="note"
    aria-label="Flight Crew View Logbook API notices"
  >
    <p class="font-semibold leading-snug">
      Uses the Flight Crew View Logbook API. Not affiliated with Flight Crew View.
    </p>
    <p class="leading-snug">
      For logbook purposes only. Not for flight planning or operational use.
    </p>
    <p class="leading-snug">
      Requires an active Flight Crew View subscription (sold separately).
    </p>
  </div>
</template>
