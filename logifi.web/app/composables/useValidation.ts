import { ref, computed, type Ref } from 'vue'
import type { LogEntry } from '~/utils/logbookTypes'
import { 
  validateFlightTime, 
  validateDate, 
  validateCrossCountry, 
  validatePart61RequiredFields,
  validateDateFormat,
  validateAirportCode,
  validateAircraftRegistration,
  validateNumericPrecision,
  parseRouteAirportCodes,
  type ValidationResult, 
  type AirportCoordinates,
  type CrossCountryAirportCoords
} from '~/utils/validation'
import { lookupAirportLocal } from '../../shared/airportLookup'
import { isCapacitorNative } from '~/composables/useCapacitorPlatform'
import { useAirportLookup } from '~/composables/useAirportLookup'
import { useLocationLookup } from '~/composables/useLocationLookup'

export const useValidation = () => {
  const validationResults: Ref<ValidationResult[]> = ref([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const { lookupAirport } = useAirportLookup()
  const { lookupLocationCoords } = useLocationLookup()

  const resolveAirportCoordinates = async (
    code: string
  ): Promise<{ latitude?: number; longitude?: number } | null> => {
    const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '')
    if (!normalizedCode) return null

    if (isCapacitorNative()) {
      const info = lookupAirportLocal(normalizedCode)
      if (info?.latitude !== undefined && info?.longitude !== undefined) {
        return { latitude: info.latitude, longitude: info.longitude }
      }
      return null
    }

    const info = await lookupAirport(normalizedCode)
    if (info?.latitude !== undefined && info?.longitude !== undefined) {
      return { latitude: info.latitude, longitude: info.longitude }
    }
    return null
  }

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

      // For simulator logbook entries, skip all validation rules.
      // The simulator logbook has its own structure and the user does not
      // want Part 61 / date / cross‑country rules applied there.
      if (entry.logbookType === 'simulator') {
        validationResults.value = []
        return []
      }

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
          const routeCodes = parseRouteAirportCodes(entry.route || '')
          const uniqueRouteCodes = [...new Set(routeCodes)]

          const [depInfo, destInfo, ...routeInfos] = await Promise.all([
            resolveAirportCoordinates(departure),
            resolveAirportCoordinates(destination),
            ...uniqueRouteCodes.map((code) => lookupLocationCoords(code))
          ])

          const airportCoords: CrossCountryAirportCoords = {}

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

          const routeCoords: AirportCoordinates[] = []
          routeInfos.forEach((info) => {
            if (info?.latitude != null && info?.longitude != null) {
              routeCoords.push({
                latitude: info.latitude,
                longitude: info.longitude
              })
            }
          })
          if (routeCoords.length > 0) {
            airportCoords.route = routeCoords
          }

          const canComputeDistance =
            airportCoords.departure &&
            (airportCoords.destination || (airportCoords.route && airportCoords.route.length > 0))

          if (canComputeDistance) {
            crossCountryResults = validateCrossCountry(entry, airportCoords)
          } else {
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
      
      // Run Part 61 required field validation
      const part61RequiredResults = validatePart61RequiredFields(entry)
      
      // Run format validation
      const formatResults: ValidationResult[] = []
      
      // Date format validation
      if (entry.date) {
        formatResults.push(...validateDateFormat(entry.date))
      }
      
      // Airport code format validation
      if (entry.departure) {
        formatResults.push(...validateAirportCode(entry.departure, 'departure'))
      }
      if (entry.destination) {
        formatResults.push(...validateAirportCode(entry.destination, 'destination'))
      }
      
      // Aircraft registration format validation
      if (entry.registration) {
        formatResults.push(...validateAircraftRegistration(entry.registration))
      }
      
      // Numeric precision validation for flight times
      if (entry.flightTime) {
        const timeFields = ['total', 'pic', 'sic', 'dual', 'solo', 'night', 'nvg', 'actualInstrument', 'simulatedInstrument', 'crossCountry', 'dualGiven'] as const
        timeFields.forEach(field => {
          const value = entry.flightTime[field]
          if (value !== null && value !== undefined) {
            formatResults.push(...validateNumericPrecision(value, field))
          }
        })
      }
      
      // Combine all validation results
      // Part 61 required fields come first (most critical), then format validation, then logical consistency checks
      const results = [
        ...part61RequiredResults,
        ...formatResults,
        ...dateResults, 
        ...flightTimeResults, 
        ...crossCountryResults
      ]
      
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

