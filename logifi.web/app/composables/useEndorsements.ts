import { computed, ref } from 'vue'
import { supabase } from '~/lib/supabase'
import { withTimeout } from '~/utils/promiseTimeout'
import { useAuth } from '~/composables/useAuth'
import { useOffline } from '~/composables/useOffline'
import { useEndorsementSyncQueue } from '~/composables/useEndorsementSyncQueue'
import type { Database } from '~/types/database'
import type { EndorsementTemplate } from '~/utils/endorsementCatalog'
import {
  computeEndorsementExpiresAt,
  missingEndorsementFields,
  renderEndorsementBody,
} from '~/utils/endorsementCatalog'
import {
  deleteEndorsementFromIndexedDB,
  getAllEndorsementsForUser,
  getEndorsementSyncQueue,
  saveEndorsementToIndexedDB,
  toPublicEndorsementRow,
  updateEndorsementInIndexedDB,
  type EndorsementRow as StoredEndorsementRow,
} from '~/utils/endorsementIndexedDB'
import { mergeRemoteEndorsements } from '../../shared/endorsementMerge'
import {
  applyLocalSignedSnapshot,
  buildImportedEndorsementRow,
  buildPendingEndorsementRow,
  newEndorsementId,
} from '~/utils/endorsementLocalRows'
import { canSignEndorsementLocally } from '~/utils/endorsementSignAuth'
import { readCachedAccountRole } from '~/utils/cachedAccountRole'
import {
  ACCOUNT_SCOPED_STORAGE_KEYS,
  getScopedItem,
} from '~/utils/userScopedStorage'

export type EndorsementRow = Database['public']['Tables']['endorsements']['Row'] & {
  _localSyncPending?: boolean
  _localSyncError?: string | null
}

export type StudentLogbookSummary = {
  entry_count: number
  total_time: number
  dual_received: number
  pic: number
  last_flight_date: string | null
}

export type StudentDossierEndorsement =
  Database['public']['Functions']['list_endorsements_for_student_as_instructor']['Returns'][number]

type EndorsementResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export type CreateEndorsementInput = {
  counterpartyId: string
  template: EndorsementTemplate
  fieldValues: Record<string, string>
}

export type RecordImportedEndorsementInput = {
  template: EndorsementTemplate
  fieldValues: Record<string, string>
  instructorFullName: string
  cfiNumber?: string
  cfiExpiration?: string | null
  paperSignedAt: string
}

const asStudent = ref<EndorsementRow[]>([])
const asInstructor = ref<EndorsementRow[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const loadedFromCache = ref(false)

function readPilotProfileFields(userId: string): {
  fullName: string | null
  cfiNumber: string | null
  cfiExpiration: string | null
} {
  try {
    const stored = getScopedItem(ACCOUNT_SCOPED_STORAGE_KEYS.PILOT_PROFILE, userId)
    if (!stored) return { fullName: null, cfiNumber: null, cfiExpiration: null }
    const parsed = JSON.parse(stored) as {
      fullName?: string
      cfiNumber?: string
      cfiExpiration?: string
    }
    return {
      fullName: parsed.fullName?.trim() || null,
      cfiNumber: parsed.cfiNumber?.trim() || null,
      cfiExpiration: parsed.cfiExpiration?.trim() || null,
    }
  } catch {
    return { fullName: null, cfiNumber: null, cfiExpiration: null }
  }
}

function splitLists(rows: EndorsementRow[], userId: string) {
  asStudent.value = rows
    .filter((e) => e.student_id === userId && e.status !== 'cancelled')
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  asInstructor.value = rows
    .filter((e) => e.instructor_id === userId && e.status !== 'cancelled')
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
}

async function paintFromIndexedDB(userId: string): Promise<void> {
  const idbRows = await getAllEndorsementsForUser(userId)
  const publicRows = idbRows.map((row) => toPublicEndorsementRow(row))
  splitLists(publicRows, userId)
  loadedFromCache.value = publicRows.length > 0
}

export const useEndorsements = () => {
  const { user } = useAuth()
  const { isOnline } = useOffline()
  const {
    enqueue,
    processQueue,
    syncError: endorsementSyncError,
    queueLength: endorsementQueueLength,
    retryFailed: retryEndorsementSync,
    refreshQueueLength,
    setActiveUserId,
    startBackgroundSync,
  } = useEndorsementSyncQueue()

  const pendingForInstructor = computed(() =>
    asInstructor.value.filter((e) => e.status === 'pending' || e.status === 'draft')
  )

  const pendingForStudent = computed(() =>
    asStudent.value.filter((e) => e.status === 'pending' || e.status === 'draft')
  )

  const pendingSignatureCount = computed(
    () => pendingForStudent.value.length + pendingForInstructor.value.length
  )

  const hasUnsyncedEndorsements = computed(
    () =>
      endorsementQueueLength.value > 0 ||
      asStudent.value.some((e) => e._localSyncPending) ||
      asInstructor.value.some((e) => e._localSyncPending)
  )

  const requireUserId = (): string => {
    const userId = user.value?.id
    if (!userId) {
      throw new Error('You must be signed in to manage endorsements')
    }
    setActiveUserId(userId)
    return userId
  }

  const buildPayload = (input: CreateEndorsementInput) => {
    const missing = missingEndorsementFields(input.template.body, input.fieldValues)
    if (missing.length > 0) {
      throw new Error(`Fill required fields: ${missing.join(', ')}`)
    }
    const rendered = renderEndorsementBody(input.template.body, input.fieldValues)
    if (rendered.includes('{{')) {
      throw new Error('All endorsement fields must be filled before saving')
    }
    const expiresAt = computeEndorsementExpiresAt(input.template)
    return {
      p_template_code: input.template.code,
      p_title: input.template.title,
      p_regulation_refs: input.template.regulationRefs,
      p_body_template: input.template.body,
      p_field_values: input.fieldValues,
      p_rendered_body: rendered,
      p_expires_at: expiresAt,
      rendered,
      expiresAt,
    }
  }

  const applyInboundMerge = async (userId: string, remoteRows: StoredEndorsementRow[]) => {
    const idbRows = await getAllEndorsementsForUser(userId)
    const queue = await getEndorsementSyncQueue(userId)
    const { merged, removedIds } = mergeRemoteEndorsements({
      localRows: idbRows.map((r) => toPublicEndorsementRow(r)),
      remoteRows,
      userId,
      syncQueue: queue,
    })

    for (const id of removedIds) {
      await deleteEndorsementFromIndexedDB(id)
    }
    for (const row of merged) {
      const synced = !queue.some((q) => q.endorsementId === row.id)
      await saveEndorsementToIndexedDB(row, userId, synced)
    }

    const refreshed = await getAllEndorsementsForUser(userId)
    splitLists(refreshed.map((r) => toPublicEndorsementRow(r)), userId)
  }

  const fetchRemoteRows = async (userId: string): Promise<StoredEndorsementRow[]> => {
    const [studentRes, instructorRes] = await Promise.all([
      supabase
        .from('endorsements')
        .select('*')
        .eq('student_id', userId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false }),
      supabase
        .from('endorsements')
        .select('*')
        .eq('instructor_id', userId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false }),
    ])
    if (studentRes.error) throw studentRes.error
    if (instructorRes.error) throw instructorRes.error
    const map = new Map<string, StoredEndorsementRow>()
    for (const row of [...(studentRes.data ?? []), ...(instructorRes.data ?? [])]) {
      map.set(row.id, row as StoredEndorsementRow)
    }
    return [...map.values()]
  }

  const loadEndorsementsLocalFirst = async (): Promise<void> => {
    const userId = user.value?.id
    if (!userId) return
    setActiveUserId(userId)
    await paintFromIndexedDB(userId)
    startBackgroundSync()
    if (!isOnline.value) return
    try {
      const remoteRows = await withTimeout(fetchRemoteRows(userId), 12_000, 'Load endorsements')
      await applyInboundMerge(userId, remoteRows)
      error.value = null
    } catch (err) {
      if (!loadedFromCache.value) {
        error.value =
          err instanceof Error ? err.message : 'Failed to load endorsements'
      }
    }
  }

  const fetchMyEndorsements = async (): Promise<EndorsementResult<EndorsementRow[]>> => {
    try {
      isLoading.value = true
      await loadEndorsementsLocalFirst()
      return { success: true, data: asStudent.value }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load endorsements'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const fetchInstructorEndorsements = async (): Promise<EndorsementResult<EndorsementRow[]>> => {
    try {
      isLoading.value = true
      await loadEndorsementsLocalFirst()
      return { success: true, data: asInstructor.value }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load instructor endorsements'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const queueOrRun = async (
    userId: string,
    endorsementId: string,
    operation: 'request' | 'issue' | 'sign' | 'cancel' | 'import',
    payload: Record<string, unknown>
  ): Promise<void> => {
    await enqueue({ endorsementId, operation, payload, userId })
    await refreshQueueLength()
    if (isOnline.value) {
      await processQueue({ silent: true })
    }
  }

  const requestEndorsement = async (
    input: CreateEndorsementInput
  ): Promise<EndorsementResult<string>> => {
    try {
      isLoading.value = true
      error.value = null
      const userId = requireUserId()
      const payload = buildPayload(input)
      const id = newEndorsementId()
      const row = buildPendingEndorsementRow({
        id,
        studentId: userId,
        instructorId: input.counterpartyId,
        status: 'pending',
        template: input.template,
        fieldValues: input.fieldValues,
        renderedBody: payload.rendered,
        expiresAt: payload.expiresAt,
      })
      await saveEndorsementToIndexedDB(row, userId, false)
      await queueOrRun(userId, id, 'request', {
        p_instructor_id: input.counterpartyId,
        p_id: id,
        p_template_code: payload.p_template_code,
        p_title: payload.p_title,
        p_regulation_refs: payload.p_regulation_refs,
        p_body_template: payload.p_body_template,
        p_field_values: payload.p_field_values,
        p_rendered_body: payload.p_rendered_body,
        p_expires_at: payload.p_expires_at,
      })
      await paintFromIndexedDB(userId)
      return { success: true, data: id }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request endorsement'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const issueEndorsement = async (
    input: CreateEndorsementInput
  ): Promise<EndorsementResult<string>> => {
    try {
      isLoading.value = true
      error.value = null
      const userId = requireUserId()
      const role = readCachedAccountRole(userId)
      if (role !== 'INSTRUCTOR' && role !== 'DUAL') {
        throw new Error('Only instructors can issue endorsements')
      }
      const payload = buildPayload(input)
      const id = newEndorsementId()
      const row = buildPendingEndorsementRow({
        id,
        studentId: input.counterpartyId,
        instructorId: userId,
        status: 'draft',
        template: input.template,
        fieldValues: input.fieldValues,
        renderedBody: payload.rendered,
        expiresAt: payload.expiresAt,
      })
      await saveEndorsementToIndexedDB(row, userId, false)
      await queueOrRun(userId, id, 'issue', {
        p_student_id: input.counterpartyId,
        p_id: id,
        p_template_code: payload.p_template_code,
        p_title: payload.p_title,
        p_regulation_refs: payload.p_regulation_refs,
        p_body_template: payload.p_body_template,
        p_field_values: payload.p_field_values,
        p_rendered_body: payload.p_rendered_body,
        p_expires_at: payload.p_expires_at,
      })
      await paintFromIndexedDB(userId)
      return { success: true, data: id }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to issue endorsement'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const signEndorsement = async (
    endorsementId: string,
    pin: string
  ): Promise<EndorsementResult<string>> => {
    try {
      isLoading.value = true
      error.value = null
      const userId = requireUserId()
      const trimmed = pin.trim()
      if (trimmed.length < 4 || trimmed.length > 12) {
        throw new Error('PIN must be between 4 and 12 characters')
      }

      const existing =
        asInstructor.value.find((e) => e.id === endorsementId) ??
        (await getAllEndorsementsForUser(userId))
          .map((r) => toPublicEndorsementRow(r))
          .find((e) => e.id === endorsementId)

      if (!existing) throw new Error('Endorsement not found')

      const auth = canSignEndorsementLocally({
        callerUserId: userId,
        instructorId: existing.instructor_id,
        role: readCachedAccountRole(userId),
      })
      if (!auth.allowed) throw new Error(auth.reason || 'Not allowed to sign')

      const profile = readPilotProfileFields(userId)
      const signedAtIso = new Date().toISOString()
      const signedRow = applyLocalSignedSnapshot(existing, {
        cfiNumber: profile.cfiNumber,
        cfiExpiration: profile.cfiExpiration,
        instructorFullName: profile.fullName,
        signedAtIso,
      })
      await updateEndorsementInIndexedDB(signedRow, { userId, synced: false, lastSyncError: null })
      await queueOrRun(userId, endorsementId, 'sign', {
        p_endorsement_id: endorsementId,
        p_pin: trimmed,
        p_signed_at: signedAtIso,
      })
      await paintFromIndexedDB(userId)
      return { success: true, data: endorsementId }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign endorsement'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const cancelEndorsement = async (endorsementId: string): Promise<EndorsementResult<true>> => {
    try {
      isLoading.value = true
      error.value = null
      const userId = requireUserId()
      const row =
        asStudent.value.find((e) => e.id === endorsementId) ||
        asInstructor.value.find((e) => e.id === endorsementId)
      if (!row) throw new Error('Endorsement not found')
      await updateEndorsementInIndexedDB(
        { ...row, status: 'cancelled', updated_at: new Date().toISOString() },
        { userId, synced: false }
      )
      await queueOrRun(userId, endorsementId, 'cancel', {})
      await paintFromIndexedDB(userId)
      return { success: true, data: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel endorsement'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const recordImportedEndorsement = async (
    input: RecordImportedEndorsementInput
  ): Promise<EndorsementResult<string>> => {
    try {
      isLoading.value = true
      error.value = null
      const userId = requireUserId()
      const name = input.instructorFullName.trim()
      if (!name) throw new Error('Paper instructor name is required')
      if (!input.paperSignedAt.trim()) throw new Error('Paper endorsement date is required')

      const missing = missingEndorsementFields(input.template.body, input.fieldValues)
      if (missing.length > 0) {
        throw new Error(`Fill required fields: ${missing.join(', ')}`)
      }
      const rendered = renderEndorsementBody(input.template.body, input.fieldValues)
      if (rendered.includes('{{')) {
        throw new Error('All endorsement fields must be filled before saving')
      }
      const expiresAt = computeEndorsementExpiresAt(input.template, new Date(input.paperSignedAt))
      const id = newEndorsementId()
      const row = buildImportedEndorsementRow({
        id,
        studentId: userId,
        record: input,
        renderedBody: rendered,
        expiresAt,
      })
      await saveEndorsementToIndexedDB(row, userId, false)
      await queueOrRun(userId, id, 'import', {
        p_id: id,
        p_template_code: input.template.code,
        p_title: input.template.title,
        p_regulation_refs: input.template.regulationRefs,
        p_body_template: input.template.body,
        p_field_values: input.fieldValues,
        p_rendered_body: rendered,
        p_instructor_full_name: name,
        p_cfi_number: input.cfiNumber?.trim() || null,
        p_cfi_expiration: input.cfiExpiration?.trim() || null,
        p_paper_signed_at: input.paperSignedAt,
        p_expires_at: expiresAt,
      })
      await paintFromIndexedDB(userId)
      return { success: true, data: id }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to record paper endorsement'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const fetchStudentLogbookSummary = async (
    studentId: string
  ): Promise<EndorsementResult<StudentLogbookSummary>> => {
    try {
      requireUserId()
      const { data, error: rpcError } = await supabase.rpc(
        'get_student_logbook_summary_for_instructor',
        { p_student_id: studentId }
      )
      if (rpcError) throw rpcError
      const row = Array.isArray(data) ? data[0] : data
      if (!row) {
        return {
          success: true,
          data: {
            entry_count: 0,
            total_time: 0,
            dual_received: 0,
            pic: 0,
            last_flight_date: null,
          },
        }
      }
      return {
        success: true,
        data: {
          entry_count: Number(row.entry_count) || 0,
          total_time: Number(row.total_time) || 0,
          dual_received: Number(row.dual_received) || 0,
          pic: Number(row.pic) || 0,
          last_flight_date: row.last_flight_date ?? null,
        },
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load student logbook summary'
      return { success: false, error: errorMessage }
    }
  }

  const fetchStudentEndorsementsAsInstructor = async (
    studentId: string
  ): Promise<EndorsementResult<StudentDossierEndorsement[]>> => {
    try {
      requireUserId()
      const { data, error: rpcError } = await supabase.rpc(
        'list_endorsements_for_student_as_instructor',
        { p_student_id: studentId }
      )
      if (rpcError) throw rpcError
      return { success: true, data: (data ?? []) as StudentDossierEndorsement[] }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load student endorsements'
      return { success: false, error: errorMessage }
    }
  }

  return {
    asStudent,
    asInstructor,
    pendingForInstructor,
    pendingForStudent,
    pendingSignatureCount,
    hasUnsyncedEndorsements,
    endorsementSyncError,
    endorsementQueueLength,
    isLoading,
    error,
    loadedFromCache,
    fetchMyEndorsements,
    fetchInstructorEndorsements,
    requestEndorsement,
    issueEndorsement,
    signEndorsement,
    cancelEndorsement,
    recordImportedEndorsement,
    fetchStudentLogbookSummary,
    fetchStudentEndorsementsAsInstructor,
    retryEndorsementSync,
    refreshEndorsements: loadEndorsementsLocalFirst,
  }
}