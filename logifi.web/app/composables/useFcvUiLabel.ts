import { computed } from 'vue'

export type FcvUiLabelMode = 'off' | 'beta' | 'coming_soon'

/**
 * Public rollout label for FC View (no per-user gating). Set `NUXT_PUBLIC_FCV_UI_LABEL` to
 * `beta` or `coming_soon`. Used on `/integrations` and on `FcvSync` when `showRolloutLabel` is true
 * (Settings → Data & Sync). Default / invalid values hide the badge.
 */
export function useFcvUiLabel() {
  const config = useRuntimeConfig()

  const mode = computed<FcvUiLabelMode>(() => {
    const raw = String(config.public.fcvUiLabel ?? '')
      .trim()
      .toLowerCase()
    if (raw === 'beta' || raw === 'coming_soon') return raw
    return 'off'
  })

  const showPill = computed(() => mode.value !== 'off')

  const pillText = computed(() =>
    mode.value === 'beta' ? 'Beta' : mode.value === 'coming_soon' ? 'Coming soon' : ''
  )

  return { mode, showPill, pillText }
}
