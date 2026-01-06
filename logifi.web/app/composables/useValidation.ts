import { ref, computed, type Ref } from 'vue'
import type { LogEntry } from '~/utils/logbookTypes'
import { validateFlightTime, validateDate, type ValidationResult } from '~/utils/validation'

export const useValidation = () => {
  const validationResults: Ref<ValidationResult[]> = ref([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

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
  const validateEntry = (entry: LogEntry, allEntries?: LogEntry[]): ValidationResult[] => {
    try {
      isLoading.value = true
      error.value = null

      // Run date validation (with allEntries for chronological checks)
      const dateResults = validateDate(entry, allEntries)
      
      // Run flight time validation
      const flightTimeResults = validateFlightTime(entry)
      
      // Combine all validation results
      const results = [...dateResults, ...flightTimeResults]
      
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

