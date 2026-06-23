<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = withDefaults(
  defineProps<{
    title: string
    isDark?: boolean
    showBack?: boolean
    backFallback?: string
  }>(),
  {
    isDark: true,
    showBack: true,
    backFallback: '/dashboard',
  }
)

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
    class="min-h-[100dvh] font-quicksand"
    :class="isDark ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'"
  >
    <header
      class="fixed inset-x-0 top-0 z-50 border-b pt-[env(safe-area-inset-top)] backdrop-blur-sm"
      :class="isDark ? 'border-white/10 bg-slate-950/95' : 'border-gray-200 bg-gray-50/95'"
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
      class="px-4 pt-[calc(3rem+env(safe-area-inset-top))]"
      :class="[
        $slots.footer
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
      class="fixed inset-x-0 bottom-0 z-50 border-t px-4 pt-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
      :class="isDark ? 'border-white/10 bg-slate-950/95' : 'border-gray-200 bg-gray-50/95'"
    >
      <div class="mx-auto max-w-md">
        <slot name="footer" />
      </div>
    </footer>
  </div>
</template>
