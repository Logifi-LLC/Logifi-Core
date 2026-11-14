import { computed } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useFar117LookbackPreference } from '~/composables/useFar117LookbackPreference'
import { calculateFar117FlightTimeLookbacks } from '~/utils/far117FlightTimeLookback'
import { getFar117LookbackFlightEntries } from '~/utils/far117LookbackEntryCache'

export function useFar117HeaderLookbacks() {
  const { user, isAuthenticated } = useAuth()
  const { showFar117Lookbacks, loadFar117LookbackPreference } =
    useFar117LookbackPreference()
  const cachedEntries = getFar117LookbackFlightEntries()

  const lookbacks = computed(() => {
    if (!cachedEntries.value) return null
    return calculateFar117FlightTimeLookbacks(cachedEntries.value)
  })

  const shouldShowFar117HeaderLookbacks = computed(() => {
    if (isAuthenticated.value !== true || !user.value) return false
    if (showFar117Lookbacks.value !== true) return false
    return lookbacks.value !== null
  })

  return {
    lookbacks,
    shouldShowFar117HeaderLookbacks,
    loadFar117LookbackPreference,
  }
}