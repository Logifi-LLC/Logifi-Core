import { ref } from 'vue'
import { supabase } from '~/lib/supabase'
import { useAuth } from '~/composables/useAuth'
import type { Database } from '~/types/database'

type Relationship = Database['public']['Tables']['instructor_student_relationships']['Row']
type RosterMemberProfile = Database['public']['Functions']['get_roster_member_profile']['Returns'][number]

export type RosterRelationship = Relationship & {
  profile: RosterMemberProfile | null
}

type RosterResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export const useRoster = () => {
  const { user } = useAuth()
  const roster = ref<RosterRelationship[]>([])
  const instructors = ref<RosterRelationship[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const requireUserId = (): string => {
    const userId = user.value?.id
    if (!userId) {
      throw new Error('You must be signed in to manage roster links')
    }
    return userId
  }

  const fetchMemberProfile = async (memberId: string): Promise<RosterMemberProfile | null> => {
    const { data, error: profileError } = await supabase.rpc('get_roster_member_profile', {
      p_user_id: memberId
    })

    if (profileError) throw profileError
    if (!data || data.length === 0) return null
    return data[0]
  }

  const enrichRelationships = async (
    rows: Relationship[],
    memberIdKey: 'student_id' | 'instructor_id'
  ): Promise<RosterRelationship[]> => {
    return Promise.all(
      rows.map(async (row) => {
        try {
          const profile = await fetchMemberProfile(row[memberIdKey])
          return { ...row, profile }
        } catch {
          return { ...row, profile: null }
        }
      })
    )
  }

  const fetchStudentRoster = async (): Promise<RosterResult<RosterRelationship[]>> => {
    try {
      isLoading.value = true
      error.value = null
      const instructorId = requireUserId()

      const { data, error: fetchError } = await supabase
        .from('instructor_student_relationships')
        .select('*')
        .eq('instructor_id', instructorId)
        .in('status', ['PENDING', 'ACTIVE'])
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      const enriched = await enrichRelationships(data ?? [], 'student_id')
      roster.value = enriched
      return { success: true, data: enriched }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch student roster'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const fetchInstructors = async (): Promise<RosterResult<RosterRelationship[]>> => {
    try {
      isLoading.value = true
      error.value = null
      const studentId = requireUserId()

      const { data, error: fetchError } = await supabase
        .from('instructor_student_relationships')
        .select('*')
        .eq('student_id', studentId)
        .in('status', ['PENDING', 'ACTIVE'])
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      const enriched = await enrichRelationships(data ?? [], 'instructor_id')
      instructors.value = enriched
      return { success: true, data: enriched }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch instructors'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const requestInstructorLink = async (
    instructorEmail: string
  ): Promise<RosterResult<{ relationshipId: string }>> => {
    try {
      isLoading.value = true
      error.value = null
      requireUserId()

      const email = instructorEmail.trim()
      if (!email) {
        throw new Error('Instructor email is required')
      }

      const { data, error: rpcError } = await supabase.rpc('request_instructor_link', {
        p_instructor_email: email,
      })

      if (rpcError) throw rpcError
      if (!data) {
        throw new Error('Failed to create instructor link request')
      }

      await fetchInstructors()
      return { success: true, data: { relationshipId: data } }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to request instructor link'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const setMainInstructor = async (
    relationshipId: string
  ): Promise<RosterResult<true>> => {
    try {
      isLoading.value = true
      error.value = null
      requireUserId()

      if (!relationshipId) {
        throw new Error('Relationship id is required')
      }

      const { error: rpcError } = await supabase.rpc('set_main_instructor', {
        p_relationship_id: relationshipId,
      })

      if (rpcError) throw rpcError

      await fetchInstructors()
      return { success: true, data: true }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to set main instructor'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const acceptStudentLink = async (
    relationshipId: string
  ): Promise<RosterResult<Relationship>> => {
    try {
      isLoading.value = true
      error.value = null
      const instructorId = requireUserId()

      if (!relationshipId) {
        throw new Error('Relationship id is required')
      }

      const { data, error: updateError } = await supabase
        .from('instructor_student_relationships')
        .update({ status: 'ACTIVE' })
        .eq('id', relationshipId)
        .eq('instructor_id', instructorId)
        .eq('status', 'PENDING')
        .select()
        .maybeSingle()

      if (updateError) throw updateError
      if (!data) {
        throw new Error('No pending relationship found to accept')
      }

      await fetchStudentRoster()
      return { success: true, data }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to accept student link'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const revokeRelationship = async (
    relationshipId: string
  ): Promise<RosterResult<Relationship>> => {
    try {
      isLoading.value = true
      error.value = null
      const userId = requireUserId()

      if (!relationshipId) {
        throw new Error('Relationship id is required')
      }

      const { data, error: updateError } = await supabase
        .from('instructor_student_relationships')
        .update({ status: 'REVOKED' })
        .eq('id', relationshipId)
        .or(`student_id.eq.${userId},instructor_id.eq.${userId}`)
        .in('status', ['PENDING', 'ACTIVE'])
        .select()
        .maybeSingle()

      if (updateError) throw updateError
      if (!data) {
        throw new Error('No relationship found to revoke')
      }

      await Promise.all([fetchInstructors(), fetchStudentRoster()])
      return { success: true, data }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to revoke relationship'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  return {
    roster,
    instructors,
    isLoading,
    error,
    requestInstructorLink,
    setMainInstructor,
    acceptStudentLink,
    revokeRelationship,
    fetchStudentRoster,
    fetchInstructors
  }
}
