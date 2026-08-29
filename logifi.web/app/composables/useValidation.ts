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

  const resolveAirportCoordinatesLocal = (
    code: string
  ): { latitude?: number; longitude?: number } | null => {
    const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '')
    if (!normalizedCode) return null
    const info = lookupAirportLocal(normalizedCode)
    if (info?.latitude !== undefined && info?.longitude !== undefined) {
      return { latitude: info.latitude, longitude: info.longitude }
    }
    return null
  }

  const resolveAirportCoordinates = async (
    code: string,
    options?: { localOnly?: boolean }
  ): Promise<{ latitude?: number; longitude?: number } | null> => {
    const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '')
    if (!normalizedCode) return null

    if (options?.localOnly || isCapacitorNative()) {
      return resolveAirportCoordinatesLocal(normalizedCode)
    }

    const info = await lookupAirport(normalizedCode)
    if (info?.latitude !== undefined && info?.longitude !== undefined) {
      return { latitude: info.latitude, longitude: info.longitude }
    }
    return null
  }

  const validationErrors = computed(() => 
    validationResults.value.filter(r => r.type === 'error')
  )

  const validationWarnings = computed(() => 
    validationResults.value.filter(r => r.type === 'warning')
  )

  const hasErrors = computed(() => validationErrors.value.length > 0)
  const hasWarnings = computed(() => validationWarnings.value.length > 0)
  const hasIssues = computed(() => hasErrors.value || hasWarnings.value)

  const validateEntry = async (
    entry: LogEntry,
    allEntries?: LogEntry[],
    options?: { localAirportsOnly?: boolean }
  ): Promise<ValidationResult[]> => {
    try {
      isLoading.value = true
      error.value = null

      if (entry.logbookType === 'simulator') {
        validationResults.value = []
        return []
      }

      const localAirportsOnly = options?.localAirportsOnly === true

      const dateResults = validateDate(entry, allEntries)
      const flightTimeResults = validateFlightTime(entry)
      
      let crossCountryResults: ValidationResult[] = []
      const departure = (entry.departure || '').trim()
      const destination = (entry.destination || '').trim()
      
      if (departure && destination && departure !== 'UNKNOWN' && destination !== 'UNKNOWN') {
        try {
          const routeCodes = parseRouteAirportCodes(entry.route || '')
          const uniqueRouteCodes = [...new Set(routeCodes)]

          const [depInfo, destInfo, ...routeInfos] = await Promise.all([
            resolveAirportCoordinates(departure, { localOnly: localAirportsOnly }),
            resolveAirportCoordinates(destination, { localOnly: localAirportsOnly }),
            ...uniqueRouteCodes.map((code) =>
              localAirportsOnly
                ? Promise.resolve(resolveAirportCoordinatesLocal(code))
                : lookupLocationCoords(code)
            )
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
          crossCountryResults = validateCrossCountry(entry)
        }
      } else {
        crossCountryResults = validateCrossCountry(entry)
      }
      
      const part61RequiredResults = validatePart61RequiredFields(entry)
      const formatResults: ValidationResult[] = []
      
      if (entry.date) {
        formatResults.push(...validateDateFormat(entry.date))
      }
      if (entry.departure) {
        formatResults.push(...validateAirportCode(entry.departure, 'departure'))
      }
      if (entry.destination) {
        formatResults.push(...validateAirportCode(entry.destination, 'destination'))
      }
      if (entry.registration) {
        formatResults.push(...validateAircraftRegistration(entry.registration))
      }
      if (entry.flightTime) {
        const timeFields = ['total', 'pic', 'sic', 'dual', 'solo', 'night', 'nvg', 'actualInstrument', 'simulatedInstrument', 'crossCountry', 'dualGiven'] as const
        timeFields.forEach(field => {
          const value = entry.flightTime[field]
          if (value !== null && value !== undefined) {
            formatResults.push(...validateNumericPrecision(value, field))
          }
        })
      }
      
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

  const clearValidation = () => {
    validationResults.value = []
    error.value = null
  }

  const getFieldResults = (field: string): ValidationResult[] => {
    return validationResults.value.filter(r => r.field === field)
  }

  const hasFieldErrors = (field: string): boolean => {
    return validationErrors.value.some(r => r.field === field)
  }

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
