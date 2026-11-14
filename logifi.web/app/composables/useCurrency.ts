import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type {
  LogEntry,
  CurrencyStatus,
  AnnualCurrencyStatus,
  PassengerCurrencyGroup,
} from '~/utils/logbookTypes'
import {
  calculatePassengerCurrency,
  calculateNightCurrency,
  calculateInstrumentCurrency,
  calculateFlightReview,
  calculateAnnualRequirements,
  calculatePassengerCurrencyGroups,
  summarizePassengerCurrencyFromGroups,
} from '~/utils/currencyCalculator'

export const useCurrency = () => {
  const passengerCurrency: Ref<CurrencyStatus | null> = ref(null)
  const nightCurrency: Ref<CurrencyStatus | null> = ref(null)
  const passengerCurrencyGroups: Ref<PassengerCurrencyGroup[]> = ref([])
  const instrumentCurrency: Ref<CurrencyStatus | null> = ref(null)
  const flightReviewCurrency: Ref<CurrencyStatus | null> = ref(null)
  const annualRequirements: Ref<AnnualCurrencyStatus | null> = ref(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Calculate all currency types for the given entries
   * @param entries - Array of log entries
   * @param referenceDate - Optional reference date (defaults to today)
   */
  const calculateAllCurrency = (entries: LogEntry[], referenceDate?: Date) => {
    try {
      isLoading.value = true
      error.value = null

      const groups = calculatePassengerCurrencyGroups(entries, referenceDate)
      const pooledPassenger = calculatePassengerCurrency(entries, referenceDate)
      const pooledNight = calculateNightCurrency(entries, referenceDate)
      passengerCurrencyGroups.value = groups
      passengerCurrency.value = summarizePassengerCurrencyFromGroups(groups, pooledPassenger, 'passenger')
      nightCurrency.value = summarizePassengerCurrencyFromGroups(groups, pooledNight, 'night')
      instrumentCurrency.value = calculateInstrumentCurrency(entries, referenceDate)
      flightReviewCurrency.value = calculateFlightReview(entries, referenceDate)
      annualRequirements.value = calculateAnnualRequirements(entries, referenceDate)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate currency'
      error.value = errorMessage
      console.error('Error calculating currency:', err)

      passengerCurrency.value = null
      nightCurrency.value = null
      passengerCurrencyGroups.value = []
      instrumentCurrency.value = null
      flightReviewCurrency.value = null
      annualRequirements.value = null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear all currency calculations
   */
  const clearCurrency = () => {
    passengerCurrency.value = null
    nightCurrency.value = null
    passengerCurrencyGroups.value = []
    instrumentCurrency.value = null
    flightReviewCurrency.value = null
    annualRequirements.value = null
    error.value = null
  }

  // Computed properties for summary statistics
  const currentCurrencyCount = computed(() => {
    let count = 0
    if (passengerCurrency.value?.isCurrent) count++
    if (nightCurrency.value?.isCurrent) count++
    if (instrumentCurrency.value?.isCurrent) count++
    if (flightReviewCurrency.value?.isCurrent) count++
    return count
  })

  const totalCurrencyTypes = computed(() => 4) // passenger, night, instrument, flight review

  const hasAnyCurrency = computed(() => {
    return passengerCurrency.value !== null ||
           nightCurrency.value !== null ||
           instrumentCurrency.value !== null ||
           flightReviewCurrency.value !== null ||
           annualRequirements.value !== null
  })

  return {
    passengerCurrency,
    nightCurrency,
    passengerCurrencyGroups,
    instrumentCurrency,
    flightReviewCurrency,
    annualRequirements,
    isLoading,
    error,
    calculateAllCurrency,
    clearCurrency,
    currentCurrencyCount,
    totalCurrencyTypes,
    hasAnyCurrency
  }
}
