<template>
  <footer
    class="relative z-10 border-t border-gray-800/50 bg-[#0a0e1a] pb-8 pt-10 transition-colors duration-300 font-quicksand"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col gap-10 md:flex-row md:gap-10 lg:gap-14">
        <div class="md:max-w-xs lg:max-w-sm">
          <NuxtLink to="/" class="inline-block rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">
            <img
              src="/images/logifi-logo.png"
              alt="Logifi"
              class="h-24 w-auto brightness-0 invert"
              width="96"
              height="96"
            />
          </NuxtLink>
          <p class="mt-4 text-sm font-medium text-gray-400 leading-relaxed">
            Free to use. Core is open source. Digifi credits are paid.
          </p>
          <ul class="mt-6 flex flex-wrap gap-2" aria-label="Logifi on social media">
            <li v-for="item in socialLinks" :key="item.href">
              <a
                :href="item.href"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="item.label"
                :class="socialLinkClass"
              >
                <Icon :name="item.icon" size="22" aria-hidden="true" />
              </a>
            </li>
          </ul>
        </div>

        <div class="grid grid-cols-1 gap-8 sm:grid-cols-3 md:flex-1">
          <div class="flex flex-col gap-3">
            <h2 class="text-sm font-bold text-gray-200">Product</h2>
            <nav class="flex flex-col gap-2.5" aria-label="Product">
              <NuxtLink to="/integrations" :class="linkClass('integrations')">Integrations</NuxtLink>
              <NuxtLink to="/pricing" :class="linkClass('pricing')">Pricing</NuxtLink>
              <NuxtLink to="/data-sources?from=landing" :class="linkClass('data-sources')">Data sources</NuxtLink>
              <AppStoreLink variant="footer" class="w-fit" />
            </nav>
          </div>

          <div class="flex flex-col gap-3">
            <h2 class="text-sm font-bold text-gray-200">Support</h2>
            <nav class="flex flex-col gap-2.5" aria-label="Support">
              <NuxtLink to="/developers?from=landing" :class="linkClass('developers')">Developers</NuxtLink>
              <NuxtLink to="/feedback?from=landing" :class="linkClass('feedback')">Feedback</NuxtLink>
              <a :href="supportMailto" :class="columnLinkClass">info@logifi.io</a>
            </nav>
          </div>

          <div class="flex flex-col gap-3">
            <h2 class="text-sm font-bold text-gray-200">Legal</h2>
            <nav class="flex flex-col gap-2.5" aria-label="Legal">
              <NuxtLink to="/terms?from=landing" :class="linkClass('terms')">Terms of Service</NuxtLink>
              <NuxtLink to="/privacy?from=landing" :class="linkClass('privacy')">Privacy Policy</NuxtLink>
            </nav>
          </div>
        </div>
      </div>

      <div class="mt-8">
        <h2 class="text-sm font-bold text-gray-200">Guides</h2>
        <nav class="mt-3 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-1" aria-label="Guides">
          <NuxtLink to="/faq" :class="guideLinkClass('faq')">FAQ</NuxtLink>
          <NuxtLink to="/how-to-digitize-a-paper-pilot-logbook" :class="guideLinkClass('digitize-logbook')">Digitize a paper logbook</NuxtLink>
          <NuxtLink to="/import-foreflight-logten-logbook" :class="guideLinkClass('import-logbook')">Import ForeFlight or LogTen</NuxtLink>
          <NuxtLink to="/airline-pilot-logbook-app" :class="guideLinkClass('airline-logbook')">Airline pilot logbook</NuxtLink>
        </nav>
      </div>

      <div
        class="mt-10 flex flex-col gap-3 border-t border-gray-800/50 pt-6 text-xs text-[#9ca3af] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      >
        <p>© {{ year }} Logifi. All rights reserved.</p>
        <p class="text-gray-400">
          Built by an airline captain
          <span class="mx-1.5 text-gray-600" aria-hidden="true">·</span>
          <a
            :href="FOUNDER_X_URL"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Founder Derek Farmer on X"
            :class="founderLinkClass"
          >
            @derekfarm
          </a>
        </p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import type { MarketingActivePage } from '~/components/MarketingHeader.vue'
import {
  DISCORD_INVITE_URL,
  FACEBOOK_PAGE_URL,
  FOUNDER_X_URL,
  GITHUB_REPO_URL,
  INSTAGRAM_URL,
  LINKEDIN_COMPANY_URL,
  SUPPORT_EMAIL,
} from '../../shared/publicSeo'

const props = defineProps<{
  activePage?: MarketingActivePage
}>()

const year = new Date().getFullYear()

const supportMailto = `mailto:${SUPPORT_EMAIL}`

const motionEase =
  'transition-[color,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none'

const columnLinkClass = `${motionEase} text-sm font-medium text-gray-400 hover:text-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 rounded`

const socialLinkClass = `inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:text-gray-200 ${motionEase} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400`

const founderLinkClass = `${motionEase} text-gray-300 hover:text-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 rounded`

const socialLinks = [
  { href: GITHUB_REPO_URL, label: 'Logifi on GitHub', icon: 'ri:github-fill' },
  { href: DISCORD_INVITE_URL, label: 'Logifi on Discord', icon: 'ri:discord-fill' },
  { href: LINKEDIN_COMPANY_URL, label: 'Logifi on LinkedIn', icon: 'ri:linkedin-box-fill' },
  { href: FACEBOOK_PAGE_URL, label: 'Logifi on Facebook', icon: 'ri:facebook-circle-fill' },
  { href: INSTAGRAM_URL, label: 'Logifi on Instagram', icon: 'ri:instagram-line' },
] as const

function linkClass(page: MarketingActivePage) {
  const isActive = props.activePage === page
  return [columnLinkClass, 'block w-fit', isActive ? 'text-blue-400' : '']
}

function guideLinkClass(page: MarketingActivePage) {
  const isActive = props.activePage === page
  return [
    columnLinkClass,
    'inline-flex min-h-11 min-w-11 max-w-full items-center whitespace-normal break-words',
    isActive ? 'text-blue-400' : '',
  ]
}
</script>