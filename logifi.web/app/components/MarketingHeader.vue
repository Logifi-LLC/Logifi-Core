<template>
  <header
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-gray-800/50 bg-[#0a0e1a]/80 backdrop-blur-md"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
      <div class="flex items-center shrink-0">
        <NuxtLink v-if="logoHref" :to="logoHref" class="flex items-center">
          <img src="/images/logifi-logo.png" alt="Logifi" class="h-32 w-auto brightness-0 invert" />
        </NuxtLink>
        <img
          v-else
          src="/images/logifi-logo.png"
          alt="Logifi"
          class="h-32 w-auto brightness-0 invert"
        />
      </div>

      <nav class="hidden md:flex items-center space-x-8">
        <a
          v-if="activePage === 'home'"
          href="#features"
          :class="navLinkClass('home-features')"
        >
          Features
        </a>
        <NuxtLink
          v-else
          to="/#features"
          :class="navLinkClass('home-features')"
        >
          Features
        </NuxtLink>
        <NuxtLink to="/integrations" :class="navLinkClass('integrations')">Integrations</NuxtLink>
        <NuxtLink to="/pricing" :class="navLinkClass('pricing')">Pricing</NuxtLink>
        <NuxtLink to="/developers?from=landing" :class="navLinkClass('developers')">Developers</NuxtLink>
        <NuxtLink to="/feedback?from=landing" :class="navLinkClass('feedback')">Feedback</NuxtLink>
        <div class="h-4 w-px bg-gray-700" />
        <button type="button" :class="navLinkClass()" @click="emit('open-auth', 'signin')">
          Sign In
        </button>
        <button
          type="button"
          class="btn-cta-primary px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all border border-blue-500/50 shadow-lg shadow-blue-900/50 hover:shadow-xl hover:shadow-blue-900/60 active:scale-[0.98]"
          @click="emit('open-auth', 'signup')"
        >
          <span class="relative z-10">Get Started</span>
        </button>
      </nav>

      <button
        type="button"
        class="md:hidden p-2 text-gray-300"
        :aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
        :aria-expanded="mobileOpen"
        @click="toggleMobile"
      >
        <Icon :name="mobileOpen ? 'ri:close-line' : 'ri:menu-line'" size="24" />
      </button>
    </div>

    <Teleport to="body">
      <Transition name="marketing-nav">
        <div
          v-if="mobileOpen"
          class="fixed inset-0 z-[60] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <button
            type="button"
            class="absolute inset-0 bg-gray-900/80 backdrop-blur-sm"
            aria-label="Close menu"
            @click="closeMobile"
          />
          <nav
            class="absolute top-0 right-0 h-full w-[min(100%,20rem)] bg-[#0a0e1a] border-l border-gray-800/50 shadow-xl flex flex-col font-quicksand"
          >
            <div class="flex items-center justify-between px-4 h-16 border-b border-gray-800/50">
              <img src="/images/logifi-logo.png" alt="Logifi" class="h-8 w-auto brightness-0 invert" />
              <button
                type="button"
                class="p-2 text-gray-300"
                aria-label="Close menu"
                @click="closeMobile"
              >
                <Icon name="ri:close-line" size="24" />
              </button>
            </div>
            <div class="flex-1 overflow-y-auto px-4 py-6 space-y-1">
              <a
                v-if="activePage === 'home'"
                href="#features"
                :class="mobileLinkClass('home-features')"
                @click="closeMobile"
              >
                Features
              </a>
              <NuxtLink
                v-else
                to="/#features"
                :class="mobileLinkClass('home-features')"
                @click="closeMobile"
              >
                Features
              </NuxtLink>
              <NuxtLink
                to="/integrations"
                :class="mobileLinkClass('integrations')"
                @click="closeMobile"
              >
                Integrations
              </NuxtLink>
              <NuxtLink
                to="/pricing"
                :class="mobileLinkClass('pricing')"
                @click="closeMobile"
              >
                Pricing
              </NuxtLink>
              <NuxtLink
                to="/developers?from=landing"
                :class="mobileLinkClass('developers')"
                @click="closeMobile"
              >
                Developers
              </NuxtLink>
              <NuxtLink
                to="/feedback?from=landing"
                :class="mobileLinkClass('feedback')"
                @click="closeMobile"
              >
                Feedback
              </NuxtLink>
            </div>
            <div class="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-3 border-t border-gray-800/50 pt-4">
              <button
                type="button"
                class="w-full py-3 text-sm font-medium text-gray-200 rounded-lg border border-gray-700/50 bg-gray-800/50 hover:bg-gray-800/70 transition-colors"
                @click="openAuthAndClose('signin')"
              >
                Sign In
              </button>
              <button
                type="button"
                class="btn-cta-primary w-full py-3 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all border border-blue-500/50 active:scale-[0.98]"
                @click="openAuthAndClose('signup')"
              >
                <span class="relative z-10">Get Started</span>
              </button>
            </div>
          </nav>
        </div>
      </Transition>
    </Teleport>
  </header>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

export type MarketingActivePage =
  | 'home'
  | 'integrations'
  | 'pricing'
  | 'developers'
  | 'feedback'
  | 'terms'
  | 'privacy'
  | 'data-sources'

const props = withDefaults(
  defineProps<{
    activePage?: MarketingActivePage
    logoHref?: string | null
  }>(),
  {
    activePage: undefined,
    logoHref: '/',
  },
)

const emit = defineEmits<{
  'open-auth': [tab: 'signin' | 'signup']
}>()

const mobileOpen = ref(false)

const navBase =
  'text-sm font-medium transition-colors'
const navActive = 'text-blue-400'
const navInactive = 'text-gray-300 hover:text-blue-400'

function navLinkClass(page?: string) {
  const isActive = page && props.activePage === page
  return [navBase, isActive ? navActive : navInactive]
}

const mobileBase =
  'block rounded-lg px-4 py-3 text-base font-medium transition-colors'
const mobileActive = 'bg-gray-800/60 text-blue-400'
const mobileInactive = 'text-gray-300 hover:bg-gray-800/40'

function mobileLinkClass(page?: string) {
  const isActive = page && props.activePage === page
  return [mobileBase, isActive ? mobileActive : mobileInactive]
}

function toggleMobile() {
  mobileOpen.value = !mobileOpen.value
}

function closeMobile() {
  mobileOpen.value = false
}

function openAuthAndClose(tab: 'signin' | 'signup') {
  closeMobile()
  emit('open-auth', tab)
}

watch(mobileOpen, (open) => {
  if (import.meta.client) {
    document.body.style.overflow = open ? 'hidden' : ''
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
.marketing-nav-enter-active,
.marketing-nav-leave-active {
  transition: opacity 0.2s ease;
}

.marketing-nav-enter-active nav,
.marketing-nav-leave-active nav {
  transition: transform 0.25s ease;
}

.marketing-nav-enter-from,
.marketing-nav-leave-to {
  opacity: 0;
}

.marketing-nav-enter-from nav,
.marketing-nav-leave-to nav {
  transform: translateX(100%);
}
</style>
