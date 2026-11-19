import { type MaybeRefOrGetter, computed, onBeforeUnmount, toValue, watch } from 'vue'
import { MARKETING_DARK_BG } from '../../shared/publicSeo'

const MARKETING_DARK_CLASS = 'marketing-dark'

/** Paints `html`/`body` for dark marketing pages and sets theme-color. Cleans up on leave / when disabled. */
export function useMarketingDarkDocument(enabled: MaybeRefOrGetter<boolean> = true) {
  const active = computed(() => toValue(enabled))

  useHead(() => {
    if (!active.value) return {}
    return {
      htmlAttrs: { class: MARKETING_DARK_CLASS },
      meta: [{ name: 'theme-color', content: MARKETING_DARK_BG }],
    }
  })

  if (import.meta.client) {
    const syncClass = (on: boolean) => {
      document.documentElement.classList.toggle(MARKETING_DARK_CLASS, on)
    }

    watch(
      active,
      (on) => {
        syncClass(on)
      },
      { immediate: true },
    )

    onBeforeUnmount(() => {
      document.documentElement.classList.remove(MARKETING_DARK_CLASS)
    })
  }
}