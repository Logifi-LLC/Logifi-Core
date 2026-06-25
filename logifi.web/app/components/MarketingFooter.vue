<template>
  <footer
    class="relative z-10 border-t border-white/10 bg-white/5 backdrop-blur-md pb-6 pt-8 transition-colors duration-300"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <p class="text-sm font-medium text-gray-600 dark:text-gray-600 text-center mb-6">
        Digital pilot logbooks — secure, organized, and FAA-compliant.
      </p>
      <p class="text-sm font-medium text-gray-600 dark:text-gray-600 text-center">
        <NuxtLink to="/integrations" :class="linkClass('integrations')">Integrations</NuxtLink>
        <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
        <NuxtLink to="/pricing" :class="linkClass('pricing')">Pricing</NuxtLink>
        <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
        <NuxtLink to="/data-sources?from=landing" :class="linkClass('data-sources')">Data sources</NuxtLink>
        <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
        <NuxtLink to="/terms?from=landing" :class="linkClass('terms')">Terms of Service</NuxtLink>
        <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
        <NuxtLink to="/privacy?from=landing" :class="linkClass('privacy')">Privacy Policy</NuxtLink>
        <span class="mx-2 text-gray-400 dark:text-gray-400">·</span>
        <NuxtLink to="/developers?from=landing" :class="linkClass('developers')">Developers</NuxtLink>
      </p>
      <p class="mt-4 text-xs text-gray-500 dark:text-gray-500 text-center">
        © {{ year }} Logifi. All rights reserved.
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
import type { MarketingActivePage } from '~/components/MarketingHeader.vue'

const props = defineProps<{
  activePage?: MarketingActivePage
}>()

const year = new Date().getFullYear()

function linkClass(page: MarketingActivePage) {
  const isActive = props.activePage === page
  return isActive
    ? 'text-blue-600 transition-colors dark:text-blue-600'
    : 'hover:text-blue-600 transition-colors dark:hover:text-blue-600'
}
</script>
