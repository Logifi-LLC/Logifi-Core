import { ref } from 'vue'
import { supabase } from '~/lib/supabase'
import { useAuth } from '~/composables/useAuth'
import type { Database } from '~/types/database'

type FlightSignature = Database['public']['Tables']['flight_signatures']['Row']

type SigningResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

const isValidUUID = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

export const useFlightSigning = () => {
  const { user } = useAuth()
  const signaturesByEntryId = ref<Record<string, FlightSignature>>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const requireUserId = (): string => {
    const userId = user.value?.id
    if (!userId) {
      throw new Error('You must be signed in to manage flight signatures')
    }
    return userId
  }

  const setSigningPin = async (pin: string): Promise<SigningResult<true>> => {
    try {
      isLoading.value = true
      error.value = null
      requireUserId()

      const trimmed = pin.trim()
      if (trimmed.length < 4 || trimmed.length > 12) {
        throw new Error('PIN must be between 4 and 12 characters')
      }

      const { error: rpcError } = await supabase.rpc('set_signing_pin', {
        p_pin: trimmed
      })

      if (rpcError) throw rpcError
      return { success: true, data: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save signing PIN'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const signLogEntry = async (
    entryId: string,
    instructorId: string,
    pin: string
  ): Promise<SigningResult<{ signatureId: string }>> => {
    try {
      isLoading.value = true
      error.value = null
      requireUserId()

      if (!isValidUUID(entryId)) {
        throw new Error('Entry must be synced to the cloud before signing')
      }
      if (!isValidUUID(instructorId)) {
        throw new Error('Instructor id is required')
      }

      const trimmed = pin.trim()
      if (trimmed.length < 4 || trimmed.length > 12) {
        throw new Error('PIN must be between 4 and 12 characters')
      }

      const { data, error: rpcError } = await supabase.rpc('sign_log_entry', {
        p_entry_id: entryId,
        p_instructor_id: instructorId,
        p_pin: trimmed
      })

      if (rpcError) throw rpcError
      if (!data) {
        throw new Error('Failed to sign log entry')
      }

      await fetchSignaturesForEntries([entryId])
      return { success: true, data: { signatureId: data } }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign log entry'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const markSignaturePending = async (
    entryId: string,
    pending = true
  ): Promise<SigningResult<true>> => {
    try {
      isLoading.value = true
      error.value = null
      const userId = requireUserId()

      if (!isValidUUID(entryId)) {
        throw new Error('Entry must be synced to the cloud before marking pending')
      }

      const { data, error: updateError } = await supabase
        .from('log_entries')
        .update({ signature_pending: pending })
        .eq('id', entryId)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle()

      if (updateError) throw updateError
      if (!data) {
        throw new Error('Entry is not synced yet. Wait a moment and try again, or stay on the entry.')
      }
      return { success: true, data: true }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update signature pending state'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const fetchSignaturesForEntries = async (
    entryIds: string[]
  ): Promise<SigningResult<Record<string, FlightSignature>>> => {
    try {
      isLoading.value = true
      error.value = null
      requireUserId()

      const uuids = [...new Set(entryIds.filter(isValidUUID))]
      if (uuids.length === 0) {
        return { success: true, data: signaturesByEntryId.value }
      }

      const { data, error: fetchError } = await supabase
        .from('flight_signatures')
        .select('*')
        .in('log_entry_id', uuids)

      if (fetchError) throw fetchError

      const next = { ...signaturesByEntryId.value }
      for (const row of data ?? []) {
        next[row.log_entry_id] = row
      }
      signaturesByEntryId.value = next
      return { success: true, data: next }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch flight signatures'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const isEntrySigned = (entryId: string | null | undefined): boolean => {
    if (!entryId) return false
    return Boolean(signaturesByEntryId.value[entryId])
  }

  return {
    signaturesByEntryId,
    isLoading,
    error,
    setSigningPin,
    signLogEntry,
    markSignaturePending,
    fetchSignaturesForEntries,
    isEntrySigned
  }
}
