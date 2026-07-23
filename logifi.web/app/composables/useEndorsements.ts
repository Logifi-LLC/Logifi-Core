import { computed, ref } from 'vue'
import { supabase } from '~/lib/supabase'
import { useAuth } from '~/composables/useAuth'
import type { Database } from '~/types/database'
import type { EndorsementTemplate } from '~/utils/endorsementCatalog'
import {
  computeEndorsementExpiresAt,
  missingEndorsementFields,
  renderEndorsementBody,
} from '~/utils/endorsementCatalog'

export type EndorsementRow = Database['public']['Tables']['endorsements']['Row']

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

export const useEndorsements = () => {
  const { user } = useAuth()
  const asStudent = ref<EndorsementRow[]>([])
  const asInstructor = ref<EndorsementRow[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const pendingForInstructor = computed(() =>
    asInstructor.value.filter((e) => e.status === 'pending' || e.status === 'draft')
  )

  const requireUserId = (): string => {
    const userId = user.value?.id
    if (!userId) {
      throw new Error('You must be signed in to manage endorsements')
    }
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
    }
  }

  const fetchMyEndorsements = async (): Promise<EndorsementResult<EndorsementRow[]>> => {
    try {
      isLoading.value = true
      error.value = null
      const studentId = requireUserId()
      const { data, error: fetchError } = await supabase
        .from('endorsements')
        .select('*')
        .eq('student_id', studentId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
      if (fetchError) throw fetchError
      asStudent.value = (data ?? []) as EndorsementRow[]
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
      error.value = null
      const instructorId = requireUserId()
      const { data, error: fetchError } = await supabase
        .from('endorsements')
        .select('*')
        .eq('instructor_id', instructorId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
      if (fetchError) throw fetchError
      asInstructor.value = (data ?? []) as EndorsementRow[]
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

  const requestEndorsement = async (
    input: CreateEndorsementInput
  ): Promise<EndorsementResult<string>> => {
    try {
      isLoading.value = true
      error.value = null
      requireUserId()
      const payload = buildPayload(input)
      const { data, error: rpcError } = await supabase.rpc('request_endorsement', {
        p_instructor_id: input.counterpartyId,
        ...payload,
      })
      if (rpcError) throw rpcError
      await fetchMyEndorsements()
      return { success: true, data: data as string }
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
      requireUserId()
      const payload = buildPayload(input)
      const { data, error: rpcError } = await supabase.rpc('issue_endorsement', {
        p_student_id: input.counterpartyId,
        ...payload,
      })
      if (rpcError) throw rpcError
      await fetchInstructorEndorsements()
      return { success: true, data: data as string }
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
      requireUserId()
      const trimmed = pin.trim()
      if (trimmed.length < 4 || trimmed.length > 12) {
        throw new Error('PIN must be between 4 and 12 characters')
      }
      const { data, error: rpcError } = await supabase.rpc('sign_endorsement', {
        p_endorsement_id: endorsementId,
        p_pin: trimmed,
      })
      if (rpcError) throw rpcError
      await fetchInstructorEndorsements()
      return { success: true, data: data as string }
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
      requireUserId()
      const { error: rpcError } = await supabase.rpc('cancel_endorsement', {
        p_endorsement_id: endorsementId,
      })
      if (rpcError) throw rpcError
      await Promise.all([fetchMyEndorsements(), fetchInstructorEndorsements()])
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
      requireUserId()
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
      const expiresAt = computeEndorsementExpiresAt(
        input.template,
        new Date(input.paperSignedAt)
      )

      const { data, error: rpcError } = await supabase.rpc('record_imported_endorsement', {
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
      if (rpcError) throw rpcError
      await fetchMyEndorsements()
      return { success: true, data: data as string }
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
    isLoading,
    error,
    fetchMyEndorsements,
    fetchInstructorEndorsements,
    requestEndorsement,
    issueEndorsement,
    signEndorsement,
    cancelEndorsement,
    recordImportedEndorsement,
    fetchStudentLogbookSummary,
    fetchStudentEndorsementsAsInstructor,
  }
}
