<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from '~/composables/useTheme'

const props = withDefaults(
  defineProps<{
    title: string
    /** When omitted, follows `useTheme()` (app appearance setting). */
    isDark?: boolean
    showBack?: boolean
    backFallback?: string
    /**
     * Fit the shell to the viewport and scroll only the main slot.
     * Document scroll stays put, so iOS cannot rubber-band past the page.
     */
    scrollContained?: boolean
  }>(),
  {
    showBack: true,
    backFallback: '/dashboard',
    scrollContained: false,
  }
)

const { isDark: themeIsDark } = useTheme()
const isDark = computed(() => props.isDark ?? themeIsDark.value)

const router = useRouter()

function onBack() {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }
  void router.push(props.backFallback)
}
</script>

<template>
  <div
    class="font-quicksand"
    :class="[
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900',
      scrollContained
        ? 'flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden overscroll-none'
        : 'min-h-[100dvh]',
    ]"
  >
    <header
      class="z-50 border-b pt-[env(safe-area-inset-top)] backdrop-blur-sm"
      :class="[
        isDark ? 'border-white/10 bg-slate-950/95' : 'border-gray-200 bg-gray-50/95',
        scrollContained ? 'relative shrink-0' : 'fixed inset-x-0 top-0',
      ]"
    >
      <div class="flex items-center justify-between px-4 py-2">
        <div class="w-20 shrink-0">
          <button
            v-if="showBack"
            type="button"
            class="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold transition-colors"
            :class="isDark ? 'text-slate-200 hover:bg-white/10' : 'text-gray-800 hover:bg-gray-200'"
            @click="onBack"
          >
            <Icon name="ri:arrow-left-line" size="18" />
            Back
          </button>
        </div>

        <h1 class="min-w-0 flex-1 truncate px-2 text-center text-base font-semibold">
          {{ title }}
        </h1>

        <div class="flex w-20 shrink-0 justify-end">
          <slot name="trailing" />
        </div>
      </div>
    </header>

    <main
      class="px-4"
      :class="[
        scrollContained
          ? 'min-h-0 flex-1 overflow-y-auto overscroll-none'
          : 'pt-[calc(3rem+env(safe-area-inset-top))]',
        scrollContained && $slots.footer
          ? 'pb-4'
          : $slots.footer
            ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]'
            : 'pb-[calc(1rem+env(safe-area-inset-bottom))]',
      ]"
    >
      <div class="mx-auto max-w-md">
        <slot />
      </div>
    </main>

    <footer
      v-if="$slots.footer"
      class="z-50 border-t px-4 pt-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
      :class="[
        isDark ? 'border-white/10 bg-slate-950/95' : 'border-gray-200 bg-gray-50/95',
        scrollContained ? 'shrink-0' : 'fixed inset-x-0 bottom-0',
      ]"
    >
      <div class="mx-auto max-w-md">
        <slot name="footer" />
      </div>
    </footer>
  </div>
</template>
