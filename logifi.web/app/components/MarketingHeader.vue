<template>
  <header
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/10 bg-white/5 backdrop-blur-md"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
      <div class="flex items-center shrink-0">
        <NuxtLink v-if="logoHref" :to="logoHref" class="flex items-center">
          <img src="/images/logifi-logo.png" alt="Logifi" class="h-32 w-auto brightness-0" />
        </NuxtLink>
        <img
          v-else
          src="/images/logifi-logo.png"
          alt="Logifi"
          class="h-32 w-auto brightness-0"
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
        <div class="h-4 w-px bg-gray-200 dark:bg-gray-200" />
        <button type="button" :class="navLinkClass()" @click="emit('open-auth', 'signin')">
          Sign In
        </button>
        <button
          type="button"
          class="btn-cta-primary px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all ring-1 ring-blue-400/60 shadow-[0_0_16px_-3px_rgba(37,99,235,0.48),0_0_32px_-12px_rgba(59,130,246,0.22)] hover:shadow-[0_0_24px_-2px_rgba(37,99,235,0.55),0_0_40px_-10px_rgba(59,130,246,0.28)] active:scale-[0.98] dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
          @click="emit('open-auth', 'signup')"
        >
          <span class="relative z-10">Get Started</span>
        </button>
      </nav>

      <button
        type="button"
        class="md:hidden p-2 text-gray-600 dark:text-gray-600"
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
            class="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            aria-label="Close menu"
            @click="closeMobile"
          />
          <nav
            class="absolute top-0 right-0 h-full w-[min(100%,20rem)] bg-[#e4e8e7] border-l border-white/20 shadow-xl flex flex-col font-quicksand"
          >
            <div class="flex items-center justify-between px-4 h-16 border-b border-white/20">
              <img src="/images/logifi-logo.png" alt="Logifi" class="h-8 w-auto brightness-0" />
              <button
                type="button"
                class="p-2 text-gray-600"
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
            <div class="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-3 border-t border-white/20 pt-4">
              <button
                type="button"
                class="w-full py-3 text-sm font-medium text-gray-700 rounded-xl border border-[#d1d8d6] bg-white hover:bg-blue-50/50 transition-colors"
                @click="openAuthAndClose('signin')"
              >
                Sign In
              </button>
              <button
                type="button"
                class="btn-cta-primary w-full py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all ring-1 ring-blue-400/60 active:scale-[0.98]"
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
  'text-sm font-medium transition-colors dark:text-gray-600 dark:hover:text-blue-600'
const navActive = 'text-blue-600 dark:text-blue-600'
const navInactive = 'text-gray-600 hover:text-blue-600'

function navLinkClass(page?: string) {
  const isActive = page && props.activePage === page
  return [navBase, isActive ? navActive : navInactive]
}

const mobileBase =
  'block rounded-xl px-4 py-3 text-base font-medium transition-colors'
const mobileActive = 'bg-white/60 text-blue-600'
const mobileInactive = 'text-gray-800 hover:bg-white/40'

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
