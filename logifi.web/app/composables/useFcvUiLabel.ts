import { computed } from 'vue'

export type FcvUiLabelMode = 'off' | 'beta' | 'coming_soon'

/**
 * Public rollout label for FC View UI (no per-user gating). Set `NUXT_PUBLIC_FCV_UI_LABEL`
 * to `beta` or `coming_soon` on the host; default / invalid values hide the badge.
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

  /** Neutral one-liner under the section title when the label is active. */
  const subcopy = computed(() =>
    showPill.value
      ? 'Access may roll out gradually on the Flight Crew View side; an active FC View subscription is still required.'
      : ''
  )

  return { mode, showPill, pillText, subcopy }
}
