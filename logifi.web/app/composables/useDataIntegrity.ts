import { ref } from 'vue'
import { supabase } from '~/lib/supabase'
import type { Database } from '~/types/database'

type IntegrityResult = Database['public']['Functions']['validate_entry_integrity']['Returns'][0]

export interface IntegrityStatus {
  entryId: string
  isValid: boolean
  currentHash: string | null
  computedHash: string | null
  lastValidated: string | null
}

export const useDataIntegrity = () => {
  const validationCache = ref<Map<string, IntegrityStatus>>(new Map())
  const isValidationInProgress = ref(false)
  const error = ref<string | null>(null)

  // Validate a single entry
  const validateEntry = async (entryId: string, createAuditLog: boolean = false): Promise<IntegrityStatus> => {
    try {
      error.value = null

      // Call the database function
      const { data, error: validateError } = await supabase
        .rpc('validate_entry_integrity', { entry_uuid: entryId })

      if (validateError) {
        throw validateError
      }

      if (!data || data.length === 0) {
        throw new Error('No validation result returned')
      }

      const result = data[0] as IntegrityResult

      const status: IntegrityStatus = {
        entryId,
        isValid: result.is_valid,
        currentHash: result.current_hash,
        computedHash: result.computed_hash,
        lastValidated: new Date().toISOString()
      }

      // Cache the result
      validationCache.value.set(entryId, status)

      // Create audit log entry for validation
      if (createAuditLog) {
        try {
          const { data: entryData } = await supabase
            .from('log_entries')
            .select('user_id')
            .eq('id', entryId)
            .single()

          if (entryData) {
            await supabase
              .from('audit_logs')
              .insert({
                entry_id: entryId,
                user_id: entryData.user_id,
                action: 'export', // Using 'export' for compliance-related validation events
                new_data: {
                  validation_result: {
                    is_valid: result.is_valid,
                    validated_at: new Date().toISOString(),
                    current_hash: result.current_hash,
                    computed_hash: result.computed_hash,
                    hash_match: result.current_hash === result.computed_hash
                  }
                },
                changed_fields: [],
                change_summary: result.is_valid 
                  ? 'Data integrity validated - entry is valid' 
                  : 'Data integrity validation failed - hash mismatch detected',
                is_compliance_event: true,
                compliance_reason: 'Automatic integrity validation'
              })
          }
        } catch (auditError) {
          // Don't fail validation if audit log creation fails
          console.warn('Failed to create validation audit log:', auditError)
        }
      }

      return status
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate entry'
      error.value = errorMessage
      console.error('Error validating entry:', err)

      // Return invalid status on error
      return {
        entryId,
        isValid: false,
        currentHash: null,
        computedHash: null,
        lastValidated: null
      }
    }
  }

  // Validate all entries for the current user
  const validateAllEntries = async (): Promise<IntegrityStatus[]> => {
    try {
      isValidationInProgress.value = true
      error.value = null

      // Get all entry IDs for the current user
      const { data: entries, error: entriesError } = await supabase
        .from('log_entries')
        .select('id')
        .order('date', { ascending: false })

      if (entriesError) {
        throw entriesError
      }

      if (!entries || entries.length === 0) {
        return []
      }

      // Validate each entry
      const validationPromises = entries.map(entry => validateEntry(entry.id))
      const results = await Promise.all(validationPromises)

      return results
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate entries'
      error.value = errorMessage
      console.error('Error validating all entries:', err)
      return []
    } finally {
      isValidationInProgress.value = false
    }
  }

  // Get cached integrity status for an entry
  const getIntegrityStatus = (entryId: string): IntegrityStatus | null => {
    return validationCache.value.get(entryId) || null
  }

  // Clear validation cache
  const clearCache = () => {
    validationCache.value.clear()
  }

  // Get validation statistics
  const getValidationStats = (statuses: IntegrityStatus[]) => {
    const total = statuses.length
    const valid = statuses.filter(s => s.isValid).length
    const invalid = statuses.filter(s => !s.isValid).length

    return {
      total,
      valid,
      invalid,
      validPercentage: total > 0 ? Math.round((valid / total) * 100) : 0
    }
  }

  return {
    validationCache,
    isValidationInProgress,
    error,
    validateEntry,
    validateAllEntries,
    getIntegrityStatus,
    clearCache,
    getValidationStats
  }
}

