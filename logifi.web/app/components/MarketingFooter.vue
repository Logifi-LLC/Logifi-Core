<template>
  <footer
    class="relative z-10 border-t border-gray-800/50 bg-[#0a0e1a] pb-6 pt-8 transition-colors duration-300"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <p class="text-sm font-medium text-gray-400 text-center mb-6">
        Free to use. Core is open source. Digifi credits are paid.
      </p>
      <p class="text-sm font-medium text-gray-400 text-center">
        <NuxtLink to="/integrations" :class="linkClass('integrations')">Integrations</NuxtLink>
        <span class="mx-2 text-gray-600">·</span>
        <NuxtLink to="/pricing" :class="linkClass('pricing')">Pricing</NuxtLink>
        <span class="mx-2 text-gray-600">·</span>
        <NuxtLink to="/data-sources?from=landing" :class="linkClass('data-sources')">Data sources</NuxtLink>
        <span class="mx-2 text-gray-600">·</span>
        <NuxtLink to="/terms?from=landing" :class="linkClass('terms')">Terms of Service</NuxtLink>
        <span class="mx-2 text-gray-600">·</span>
        <NuxtLink to="/privacy?from=landing" :class="linkClass('privacy')">Privacy Policy</NuxtLink>
        <span class="mx-2 text-gray-600">·</span>
        <NuxtLink to="/developers?from=landing" :class="linkClass('developers')">Developers</NuxtLink>
      </p>
      <p class="mt-4 text-xs text-gray-500 text-center">
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
    ? 'text-blue-400 transition-colors'
    : 'hover:text-blue-400 transition-colors'
}
</script>
