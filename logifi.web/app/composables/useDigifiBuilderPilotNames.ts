import { ref, watchEffect, type Ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { supabase } from '~/lib/supabase'

/** Pilot name suggestions for Digifi builder / mobile review (matches logbook-builder). */
export function useDigifiBuilderPilotNames(): Ref<string[]> {
  const pilots = ref<string[]>([])
  const { user, isAuthenticated } = useAuth()

  watchEffect(async (onCleanup) => {
    const currentUser = user.value
    if (!isAuthenticated.value || !currentUser) {
      pilots.value = []
      return
    }

    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })

    try {
      const { data, error } = await (supabase as any)
        .from('log_entries')
        .select('training_elements')
        .eq('user_id', currentUser.id)

      if (error || !data || cancelled) return

      const names = (data as { training_elements: string | null }[])
        .map((row) => (row.training_elements || '').trim())
        .filter(Boolean)

      pilots.value = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
    } catch {
      if (!cancelled) pilots.value = []
    }
  })

  return pilots
}
