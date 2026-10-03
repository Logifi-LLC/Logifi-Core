import { ref, watchEffect, type Ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { supabase } from '~/lib/supabase'
import { getAllEntriesFromIndexedDB } from '~/utils/indexedDB'
import { mergePilotNameSuggestions } from '~/utils/pilotNameSuggest'

/**
 * Pilot name suggestions for Digifi builder / mobile review.
 * iOS keeps the logbook in IndexedDB (local-first). A Supabase-only read
 * often comes back empty on device, which hides the Pilot typeahead.
 */
export function useDigifiBuilderPilotNames(): Ref<string[]> {
  const pilots = ref<string[]>([])
  const { user, isAuthenticated } = useAuth()

  watchEffect((onCleanup) => {
    const currentUser = user.value
    if (!isAuthenticated.value || !currentUser) {
      pilots.value = []
      return
    }

    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })
    pilots.value = []

    void (async () => {
      let localNames: string[] = []
      try {
        const entries = await getAllEntriesFromIndexedDB(currentUser.id)
        localNames = entries.map((entry) => entry.trainingElements)
      } catch {
        localNames = []
      }
      if (cancelled) return
      if (localNames.length > 0) {
        pilots.value = mergePilotNameSuggestions([localNames])
      }

      try {
        const { data, error } = await (supabase as any)
          .from('log_entries')
          .select('training_elements')
          .eq('user_id', currentUser.id)
          .not('training_elements', 'is', null)
          .limit(1000)

        if (cancelled || error || !data) return

        const remoteNames = (data as { training_elements: string | null }[]).map(
          (row) => row.training_elements
        )
        pilots.value = mergePilotNameSuggestions([localNames, remoteNames])
      } catch {
        if (!cancelled && localNames.length > 0) {
          pilots.value = mergePilotNameSuggestions([localNames])
        }
      }
    })()
  })

  return pilots
}
