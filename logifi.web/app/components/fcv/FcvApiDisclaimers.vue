<script setup lang="ts">
/**
 * FCV Logbook API Access Policy v1.1 — Section 5.1 required wording (verbatim).
 */
withDefaults(
  defineProps<{
    isDarkMode?: boolean
    /**
     * Marketing/legal: `marketing` = solid light card on mint landing.
     * `marketing-dark` = translucent card on dark topography / glass shells.
     * Dashboard: follows isDarkMode.
     */
    tone?: 'marketing' | 'marketing-dark' | 'dashboard'
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
      'rounded-xl border p-4 text-sm space-y-2 transition-colors',
      tone === 'marketing'
        ? 'border-gray-200 bg-white shadow-sm text-gray-700 dark:border-gray-200 dark:bg-white dark:text-gray-700 dark:shadow-sm dark:shadow-black/25'
        : tone === 'marketing-dark'
          ? 'border-white/15 bg-white/5 text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
          : isDarkMode
            ? 'border-gray-700 bg-gray-800/40 text-gray-300'
            : 'border-gray-200 bg-gray-50/80 text-gray-700',
    ]"
    role="note"
    aria-label="Flight Crew View Logbook API notices"
  >
    <div class="flex items-start gap-3">
      <Icon
        name="ri:information-line"
        size="20"
        :class="[
          'shrink-0 mt-0.5',
          tone === 'marketing'
            ? 'text-blue-500 dark:text-blue-500'
            : tone === 'marketing-dark'
              ? 'text-blue-400'
              : isDarkMode ? 'text-blue-400' : 'text-blue-600'
        ]"
      />
      <div class="space-y-1.5 leading-relaxed">
        <p
          :class="[
            'font-medium',
            tone === 'marketing'
              ? 'text-gray-900 dark:text-gray-900'
              : tone === 'marketing-dark'
                ? 'text-slate-100'
                : isDarkMode
                  ? 'text-gray-100'
                  : 'text-gray-900',
          ]"
        >
          Uses the Flight Crew View Logbook API. Not affiliated with Flight Crew View.
        </p>
        <p>
          For logbook purposes only. Not for flight planning or operational use.
        </p>
        <p>
          Requires an active Flight Crew View subscription (sold separately).
        </p>
      </div>
    </div>
  </div>
</template>
