import { ref, computed, type Ref } from 'vue'
import type { LogEntry } from '~/utils/logbookTypes'
import { validateFlightTime, validateDate, validateCrossCountry, type ValidationResult, type AirportCoordinates } from '~/utils/validation'
import { useAirportLookup } from '~/composables/useAirportLookup'

export const useValidation = () => {
  const validationResults: Ref<ValidationResult[]> = ref([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const { lookupAirport } = useAirportLookup()

  // Separate errors and warnings
  const validationErrors = computed(() => 
    validationResults.value.filter(r => r.type === 'error')
  )

  const validationWarnings = computed(() => 
    validationResults.value.filter(r => r.type === 'warning')
  )

  const hasErrors = computed(() => validationErrors.value.length > 0)
  const hasWarnings = computed(() => validationWarnings.value.length > 0)
  const hasIssues = computed(() => hasErrors.value || hasWarnings.value)

  /**
   * Validate a log entry and update validation state
   * @param entry - The log entry to validate
   * @param allEntries - Optional array of all entries for chronological order validation
   */
  const validateEntry = async (entry: LogEntry, allEntries?: LogEntry[]): Promise<ValidationResult[]> => {
    try {
      isLoading.value = true
      error.value = null

      // Run date validation (with allEntries for chronological checks)
      const dateResults = validateDate(entry, allEntries)
      
      // Run flight time validation
      const flightTimeResults = validateFlightTime(entry)
      
      // Run cross-country validation with distance calculation if airports are available
      let crossCountryResults: ValidationResult[] = []
      const departure = (entry.departure || '').trim()
      const destination = (entry.destination || '').trim()
      
      if (departure && destination && departure !== 'UNKNOWN' && destination !== 'UNKNOWN') {
        try {
          // Lookup airport coordinates for distance calculation
          const [depInfo, destInfo] = await Promise.all([
            lookupAirport(departure),
            lookupAirport(destination)
          ])
          
          const airportCoords: { departure?: AirportCoordinates; destination?: AirportCoordinates } = {}
          
          if (depInfo?.latitude !== undefined && depInfo?.longitude !== undefined) {
            airportCoords.departure = {
              latitude: depInfo.latitude,
              longitude: depInfo.longitude
            }
          }
          
          if (destInfo?.latitude !== undefined && destInfo?.longitude !== undefined) {
            airportCoords.destination = {
              latitude: destInfo.latitude,
              longitude: destInfo.longitude
            }
          }
          
          // Only pass coordinates if we have both
          if (airportCoords.departure && airportCoords.destination) {
            crossCountryResults = validateCrossCountry(entry, airportCoords)
          } else {
            // Fall back to basic validation without distance
            crossCountryResults = validateCrossCountry(entry)
          }
        } catch (err) {
          console.warn('Failed to lookup airport coordinates for cross-country validation:', err)
          // Fall back to basic validation without distance
          crossCountryResults = validateCrossCountry(entry)
        }
      } else {
        // Basic validation without distance
        crossCountryResults = validateCrossCountry(entry)
      }
      
      // Combine all validation results
      const results = [...dateResults, ...flightTimeResults, ...crossCountryResults]
      
      validationResults.value = results

      return results
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate entry'
      error.value = errorMessage
      console.error('Error validating entry:', err)
      validationResults.value = []
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear validation state
   */
  const clearValidation = () => {
    validationResults.value = []
    error.value = null
  }

  /**
   * Get validation results for a specific field
   */
  const getFieldResults = (field: string): ValidationResult[] => {
    return validationResults.value.filter(r => r.field === field)
  }

  /**
   * Check if a specific field has errors
   */
  const hasFieldErrors = (field: string): boolean => {
    return validationErrors.value.some(r => r.field === field)
  }

  /**
   * Check if a specific field has warnings
   */
  const hasFieldWarnings = (field: string): boolean => {
    return validationWarnings.value.some(r => r.field === field)
  }

  return {
    validationResults,
    validationErrors,
    validationWarnings,
    hasErrors,
    hasWarnings,
    hasIssues,
    isLoading,
    error,
    validateEntry,
    clearValidation,
    getFieldResults,
    hasFieldErrors,
    hasFieldWarnings
  }
}

