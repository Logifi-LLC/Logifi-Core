import { ref, watch } from 'vue'
import { supabase } from '~/lib/supabase'
import { useAuth } from '~/composables/useAuth'
import type { Database } from '~/types/database'
import {
  cfiCertificateNumberError,
  cfiExpirationError,
  cfiSignerNameError,
  normalizeCfiExpiration,
} from '~/utils/cfiCertificateFields'
import {
  canAuthenticatedInstructorSign,
  ownerCannotSignAsInstructorError,
} from '~/utils/flightSigningAuth'
import { apiFetch } from '~/utils/apiFetch'

type FlightSignature = Database['public']['Tables']['flight_signatures']['Row']
type LogEntryRow = Database['public']['Tables']['log_entries']['Row']
type PendingSignatureRow =
  Database['public']['Functions']['list_pending_signatures_for_instructor']['Returns'][number]

type SigningResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

const isValidUUID = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

export type PendingSignatureForInstructor = PendingSignatureRow

export type PendingSignatureEntryDetail = {
  studentName: string | null
  entry: LogEntryRow
}

const signaturesByEntryId = ref<Record<string, FlightSignature>>({})
const pendingSignatures = ref<PendingSignatureForInstructor[]>([])
const flightSigningLoading = ref(false)
const flightSigningError = ref<string | null>(null)

let sessionUserWatchStarted = false

/** Clears module-level signing caches when the auth session changes (sign-out / account switch). */
export function clearFlightSigningSessionCache(): void {
  signaturesByEntryId.value = {}
  pendingSignatures.value = []
}

export const useFlightSigning = () => {
  const { user, getAccessToken } = useAuth()
  const isLoading = flightSigningLoading
  const error = flightSigningError

  if (import.meta.client && !sessionUserWatchStarted) {
    sessionUserWatchStarted = true
    watch(
      () => user.value?.id ?? null,
      (nextId, prevId) => {
        if (nextId !== prevId) {
          clearFlightSigningSessionCache()
        }
      }
    )
  }

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

      const callerId = requireUserId()
      if (!canAuthenticatedInstructorSign({ callerId, instructorId })) {
        throw new Error(ownerCannotSignAsInstructorError())
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
      pendingSignatures.value = pendingSignatures.value.filter(
        (row) => row.log_entry_id !== entryId
      )
      return { success: true, data: { signatureId: data } }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign log entry'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const confirmEntryPendingInCloud = async (
    entryId: string,
    instructorId: string
  ): Promise<SigningResult<true>> => {
    try {
      requireUserId()

      if (!isValidUUID(entryId) || !isValidUUID(instructorId)) {
        throw new Error('Entry must be synced to the cloud before confirming pending state')
      }

      const { data, error: fetchError } = await supabase
        .from('log_entries')
        .select('signature_pending, pending_instructor_id')
        .eq('id', entryId)
        .maybeSingle()

      if (fetchError) throw fetchError
      if (!data) {
        throw new Error('Entry not found in cloud yet')
      }
      if (data.signature_pending !== true) {
        throw new Error('Pending signature flag is not set in cloud')
      }
      if (data.pending_instructor_id !== instructorId) {
        throw new Error('Instructor assignment does not match in cloud')
      }

      return { success: true, data: true }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to confirm pending signature in cloud'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    }
  }

  const markSignaturePending = async (
    entryId: string,
    pending = true,
    instructorId?: string | null
  ): Promise<SigningResult<true>> => {
    try {
      isLoading.value = true
      error.value = null
      const userId = requireUserId()

      if (!isValidUUID(entryId)) {
        throw new Error('Entry must be synced to the cloud before marking pending')
      }

      const payload: {
        signature_pending: boolean
        pending_instructor_id: string | null
      } = {
        signature_pending: pending,
        pending_instructor_id: null
      }

      if (pending) {
        if (!instructorId || !isValidUUID(instructorId)) {
          throw new Error('Select an instructor to send for signing')
        }
        payload.pending_instructor_id = instructorId
      }

      const { data, error: updateError } = await supabase
        .from('log_entries')
        .update(payload)
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

  const fetchPendingSignaturesForInstructor = async (): Promise<
    SigningResult<PendingSignatureForInstructor[]>
  > => {
    try {
      isLoading.value = true
      error.value = null
      requireUserId()

      const { data, error: rpcError } = await supabase.rpc(
        'list_pending_signatures_for_instructor'
      )

      if (rpcError) throw rpcError

      pendingSignatures.value = data ?? []
      return { success: true, data: pendingSignatures.value }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load pending signatures'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const fetchPendingSignatureEntry = async (
    entryId: string
  ): Promise<SigningResult<PendingSignatureEntryDetail>> => {
    try {
      isLoading.value = true
      error.value = null
      requireUserId()

      if (!isValidUUID(entryId)) {
        throw new Error('Invalid entry id')
      }

      const { data, error: rpcError } = await supabase.rpc('get_pending_signature_entry', {
        p_entry_id: entryId
      })

      if (rpcError) throw rpcError
      if (!data || typeof data !== 'object') {
        throw new Error('Entry not found or not available for review')
      }

      const payload = data as Record<string, unknown>
      const entry = payload.entry
      if (!entry || typeof entry !== 'object') {
        throw new Error('Entry not found or not available for review')
      }

      return {
        success: true,
        data: {
          studentName:
            typeof payload.student_name === 'string' ? payload.student_name : null,
          entry: entry as LogEntryRow
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load entry for review'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const fetchOwnCfiIdentity = async (): Promise<
    SigningResult<{ name: string; certificateNumber: string; expiration: string }>
  > => {
    try {
      const userId = requireUserId()
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('full_name, cfi_number, cfi_expiration')
        .eq('id', userId)
        .maybeSingle()
      if (fetchError) throw fetchError
      const name = (data?.full_name || '').trim()
      const certificateNumber = (data?.cfi_number || '').trim()
      const expiration = normalizeCfiExpiration(data?.cfi_expiration)
      const nameError = cfiSignerNameError(name)
      const certError = cfiCertificateNumberError(certificateNumber)
      const expError = cfiExpirationError(expiration)
      if (nameError || certError || expError) {
        throw new Error(
          'Add your name, CFI number, and expiration in Pilot Profile before signing'
        )
      }
      return { success: true, data: { name, certificateNumber, expiration } }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'CFI identity is incomplete'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    }
  }

  const requestSignatureEmail = async (
    entryId: string
  ): Promise<SigningResult<true>> => {
    try {
      requireUserId()
      if (!isValidUUID(entryId)) {
        throw new Error('Entry must be synced to the cloud before requesting a signature')
      }
      const token = getAccessToken()
      await apiFetch('/api/signature-request', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: { entryId },
      })
      return { success: true, data: true }
    } catch (err) {
      const errorMessage =
        (err as { data?: { statusMessage?: string } })?.data?.statusMessage ||
        (err instanceof Error ? err.message : 'Failed to send signature request')
      error.value = errorMessage
      return { success: false, error: errorMessage }
    }
  }

  const guestSignLogEntry = async (
    entryId: string,
    guestName: string,
    guestCertificateNumber: string | null,
    signatureBlob: Blob,
    guestCertificateExpiration?: string | null
  ): Promise<SigningResult<{ signatureId: string; drawnSignatureUrl: string }>> => {
    try {
      isLoading.value = true
      error.value = null
      const userId = requireUserId()

      if (!isValidUUID(entryId)) {
        throw new Error('Entry must be synced to the cloud before signing')
      }

      const name = guestName.trim()
      const nameError = cfiSignerNameError(name)
      if (nameError) {
        throw new Error(nameError)
      }
      const cert = (guestCertificateNumber || '').trim()
      const certError = cfiCertificateNumberError(cert)
      if (certError) {
        throw new Error(certError)
      }
      const expiration = (guestCertificateExpiration || '').trim().slice(0, 10)
      const expError = cfiExpirationError(expiration)
      if (expError) {
        throw new Error(expError)
      }
      if (!signatureBlob || signatureBlob.size === 0) {
        throw new Error('Draw a signature before signing')
      }

      const ext = signatureBlob.type === 'image/webp' ? 'webp' : 'png'
      const storagePath = `${userId}/${entryId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('flight-signatures')
        .upload(storagePath, signatureBlob, {
          contentType: signatureBlob.type || 'image/png',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const drawnSignatureUrl = storagePath

      const { data, error: rpcError } = await supabase.rpc('guest_sign_log_entry', {
        p_entry_id: entryId,
        p_guest_name: name,
        p_guest_certificate_number: cert,
        p_guest_certificate_expiration: expiration,
        p_drawn_signature_url: drawnSignatureUrl,
      })

      if (rpcError) throw rpcError
      if (!data) {
        throw new Error('Failed to sign log entry with guest signature')
      }

      await fetchSignaturesForEntries([entryId])
      return {
        success: true,
        data: { signatureId: data, drawnSignatureUrl },
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to guest-sign log entry'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const getDrawnSignatureDisplayUrl = async (
    storagePath: string | null | undefined
  ): Promise<string | null> => {
    if (!storagePath) return null
    if (/^https?:\/\//i.test(storagePath)) return storagePath
    const normalized = storagePath.trim().replace(/^flight-signatures\//, '')
    try {
      const { data, error: urlError } = await supabase.storage
        .from('flight-signatures')
        .createSignedUrl(normalized, 60 * 60)
      if (urlError) throw urlError
      return data?.signedUrl ?? null
    } catch {
      return null
    }
  }

  const getDrawnSignatureDisplayUrlForEntry = async (
    entryId: string
  ): Promise<string | null> => {
    if (!entryId.trim()) return null
    try {
      const { apiFetch } = await import('~/utils/apiFetch')
      const res = await apiFetch<{ url: string | null }>('/api/flight-signature/drawn-url', {
        query: { entryId },
      })
      return res.url
    } catch {
      return null
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

      const SIGNATURE_IN_CHUNK = 200
      const next = { ...signaturesByEntryId.value }
      for (let i = 0; i < uuids.length; i += SIGNATURE_IN_CHUNK) {
        const chunk = uuids.slice(i, i + SIGNATURE_IN_CHUNK)
        const { data, error: fetchError } = await supabase
          .from('flight_signatures')
          .select('*')
          .in('log_entry_id', chunk)

        if (fetchError) throw fetchError

        for (const row of data ?? []) {
          next[row.log_entry_id] = row
        }
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

  const fetchIssuedSignaturesForInstructor = async (): Promise<
    SigningResult<FlightSignature[]>
  > => {
    try {
      isLoading.value = true
      error.value = null
      const userId = requireUserId()
      const cutoff = new Date()
      cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 3)
      const { data, error: fetchError } = await supabase
        .from('flight_signatures')
        .select('*')
        .eq('signer_id', userId)
        .gte('signed_at', cutoff.toISOString())
        .order('signed_at', { ascending: false })
      if (fetchError) throw fetchError
      return { success: true, data: data ?? [] }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load issued signatures'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  return {
    signaturesByEntryId,
    pendingSignatures,
    isLoading,
    error,
    setSigningPin,
    signLogEntry,
    guestSignLogEntry,
    fetchOwnCfiIdentity,
    requestSignatureEmail,
    getDrawnSignatureDisplayUrl,
    getDrawnSignatureDisplayUrlForEntry,
    markSignaturePending,
    confirmEntryPendingInCloud,
    fetchPendingSignaturesForInstructor,
    fetchPendingSignatureEntry,
    fetchSignaturesForEntries,
    fetchIssuedSignaturesForInstructor,
    isEntrySigned
  }
}
