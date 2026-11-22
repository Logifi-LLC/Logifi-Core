<template>
  <div class="min-h-screen overflow-x-hidden bg-[#0a0e1a] font-quicksand text-gray-100">
    <MarketingHeader @open-auth="openAuth" />

    <main class="px-4 pb-16 pt-32 sm:px-6">
      <article class="mx-auto max-w-prose break-words">
        <template v-for="(block, index) in page.blocks" :key="index">
          <h1
            v-if="block.type === 'h1'"
            class="mb-6 text-3xl font-bold leading-tight text-gray-100 sm:text-4xl"
          >
            {{ block.text }}
          </h1>
          <h2
            v-else-if="block.type === 'h2'"
            class="mb-4 mt-8 text-xl font-bold leading-snug text-gray-100"
          >
            {{ block.text }}
          </h2>
          <p v-else-if="block.type === 'p'" class="mb-4 text-base leading-relaxed text-gray-300">
            <MarketingInlines :inlines="block.inlines" />
          </p>
          <ul
            v-else-if="block.type === 'ul'"
            :class="listClass(index, false)"
          >
            <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
              <MarketingInlines :inlines="item" />
            </li>
          </ul>
          <ol v-else :class="listClass(index, true)">
            <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
              <MarketingInlines :inlines="item" />
            </li>
          </ol>
        </template>
      </article>
    </main>

    <MarketingFooter :active-page="page.activePage" class="mt-12" />

    <ClientOnly>
      <AuthModal
        v-if="showAuth"
        :initial-tab="authTab"
        @close="showAuth = false"
        @success="handleAuthSuccess"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import AuthModal from '~/components/AuthModal.vue'
import MarketingFooter from '~/components/MarketingFooter.vue'
import MarketingHeader from '~/components/MarketingHeader.vue'
import MarketingInlines from '~/components/MarketingInlines.vue'
import { getMarketingPage, serializeJsonLd } from '../../shared/marketingPages'

const route = useRoute()
const page = computed(() => {
  const found = getMarketingPage(route.path)
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Page Not Found' })
  return found
})

useMarketingDarkDocument()

const { theme, isDark, applyDocumentTheme } = useTheme()

if (import.meta.client) {
  applyDocumentTheme('light')
  onBeforeUnmount(() => {
    applyDocumentTheme(theme.value)
  })
  watch([theme, isDark], () => {
    applyDocumentTheme('light')
  })
  watch(
    () => page.value.canonical,
    (href) => {
      let link = document.head.querySelector('link[rel="canonical"]')
      if (!(link instanceof HTMLLinkElement)) {
        link = document.createElement('link')
        link.rel = 'canonical'
        document.head.appendChild(link)
      }
      link.dataset.marketingPath = page.value.path
      link.href = href
    },
    { immediate: true },
  )
  watch(
    () => serializeJsonLd(page.value.jsonLd),
    (json) => {
      let script = document.getElementById('marketing-jsonld')
      if (!(script instanceof HTMLScriptElement)) {
        script = document.createElement('script')
        script.id = 'marketing-jsonld'
        script.type = 'application/ld+json'
        document.head.appendChild(script)
      }
      script.dataset.path = page.value.path
      script.textContent = json
    },
    { immediate: true },
  )
  onBeforeUnmount(() => {
    const script = document.getElementById('marketing-jsonld')
    if (script instanceof HTMLScriptElement && script.dataset.path === page.value.path) {
      script.remove()
    }
    const link = document.head.querySelector('link[rel="canonical"]')
    if (link instanceof HTMLLinkElement && link.dataset.marketingPath === page.value.path) {
      link.remove()
    }
  })
}

function listClass(index: number, ordered: boolean) {
  const previous = page.value.blocks[index - 1]
  const sources = previous?.type === 'h2' && previous.text === 'Sources'
  return [
    'mb-4 space-y-2 pl-6 leading-relaxed text-gray-300',
    ordered ? 'list-decimal' : 'list-disc',
    sources ? 'text-sm' : 'text-base',
  ]
}

const showAuth = ref(false)
const authTab = ref<'signin' | 'signup'>('signin')

const openAuth = (tab: 'signin' | 'signup') => {
  authTab.value = tab
  showAuth.value = true
}

const handleAuthSuccess = () => {
  window.location.href = '/dashboard'
}

useSeoMeta({
  title: computed(() => page.value.title),
  description: computed(() => page.value.description),
  ogTitle: computed(() => page.value.title),
  ogDescription: computed(() => page.value.description),
  ogType: computed(() => (page.value.kind === 'article' ? 'article' : 'website')),
  ogUrl: computed(() => page.value.canonical),
  twitterTitle: computed(() => page.value.title),
  twitterDescription: computed(() => page.value.description),
})

</script>
