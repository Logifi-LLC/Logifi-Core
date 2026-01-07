import { ref } from 'vue'
import { supabase } from '~/lib/supabase'
import type { Database } from '~/types/database'

type AuditLog = Database['public']['Tables']['audit_logs']['Row']
type EntryRevision = Database['public']['Tables']['entry_revisions']['Row']

export interface AuditLogWithDisplay extends AuditLog {
  displayTime: string
  relativeTime: string
}

export interface EntryRevisionWithDisplay extends EntryRevision {
  displayTime: string
  relativeTime: string
}

export const useAuditTrail = () => {
  const auditLogs = ref<AuditLogWithDisplay[]>([])
  const entryRevisions = ref<EntryRevisionWithDisplay[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isEntrySynced = ref<boolean | null>(null) // null = unknown, true = synced, false = not synced

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    let relativeTime = ''
    if (diffMins < 1) {
      relativeTime = 'Just now'
    } else if (diffMins < 60) {
      relativeTime = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    } else if (diffHours < 24) {
      relativeTime = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else if (diffDays < 7) {
      relativeTime = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else {
      relativeTime = date.toLocaleDateString()
    }

    const displayTime = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    return { displayTime, relativeTime }
  }

  // Helper function to check if a string is a valid UUID
  const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }

  // Helper function to find entry UUID in Supabase by matching fields
  const findEntryUUID = async (entryId: string, localEntry?: any): Promise<string | null> => {
    // If it's already a UUID, return it
    if (isValidUUID(entryId)) {
      return entryId
    }

    // If we have local entry data, try to find it in Supabase
    if (localEntry) {
      try {
        const { data: matchingEntries, error: findError } = await supabase
          .from('log_entries')
          .select('id, date, registration, departure, destination')
          .eq('date', localEntry.date)
          .eq('registration', localEntry.registration)
          .eq('departure', localEntry.departure)
          .eq('destination', localEntry.destination)
          .limit(1)

        if (!findError && matchingEntries && matchingEntries.length > 0) {
          return matchingEntries[0].id
        }
      } catch (err) {
        console.warn('[AuditTrail] Failed to find entry UUID:', err)
      }
    }

    return null
  }

  // Fetch audit logs for a specific entry
  const getAuditLogs = async (entryId: string, localEntry?: any) => {
    try {
      isLoading.value = true
      error.value = null
      isEntrySynced.value = null // Reset sync status

      // Try to find the UUID if entryId is not a UUID
      const supabaseId = await findEntryUUID(entryId, localEntry) || entryId

      // First, check if the entry exists in Supabase
      if (isValidUUID(supabaseId)) {
        const { data: entryExists, error: checkError } = await supabase
          .from('log_entries')
          .select('id')
          .eq('id', supabaseId)
          .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
          // Error other than "not found" - log it but continue
          console.warn('[AuditTrail] Error checking if entry exists:', checkError)
        }

        // Set sync status based on whether entry exists
        isEntrySynced.value = !!entryExists
      } else {
        // Non-UUID ID means entry likely hasn't synced
        isEntrySynced.value = false
      }

      const { data, error: fetchError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entry_id', supabaseId)
        .order('timestamp', { ascending: false })

      if (fetchError) {
        // If error is about invalid UUID and we have a non-UUID ID, 
        // the entry probably doesn't exist in Supabase yet
        if (fetchError.message?.includes('invalid input syntax for type uuid') && !isValidUUID(entryId)) {
          console.log('[AuditTrail] Entry not in Supabase (invalid UUID), no audit logs available')
          auditLogs.value = []
          isEntrySynced.value = false
          return { success: true, data: [] }
        }
        throw fetchError
      }

      // Filter out duplicate validation logs - only keep the most recent one per minute
      const filteredData = (data || []).filter((log, index, arr) => {
        // If it's a validation log (export action with compliance event)
        if (log.action === 'export' && log.is_compliance_event && log.new_data?.validation_result) {
          // Check if there's a more recent validation log within the same minute
          const logTime = new Date(log.timestamp)
          const sameMinuteLogs = arr.filter((l, i) => {
            if (i >= index) return false // Only check earlier logs
            if (l.action === 'export' && l.is_compliance_event && l.new_data?.validation_result) {
              const lTime = new Date(l.timestamp)
              // Same minute
              return lTime.getFullYear() === logTime.getFullYear() &&
                     lTime.getMonth() === logTime.getMonth() &&
                     lTime.getDate() === logTime.getDate() &&
                     lTime.getHours() === logTime.getHours() &&
                     lTime.getMinutes() === logTime.getMinutes()
            }
            return false
          })
          // If there's a more recent one in the same minute, filter this one out
          return sameMinuteLogs.length === 0
        }
        // Keep all non-validation logs
        return true
      })

      auditLogs.value = filteredData.map(log => ({
        ...log,
        ...formatTimestamp(log.timestamp)
      }))

      return { success: true, data: auditLogs.value }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch audit logs'
      error.value = errorMessage
      console.error('Error fetching audit logs:', err)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // Fetch entry revisions for a specific entry
  const getEntryRevisions = async (entryId: string, localEntry?: any) => {
    try {
      isLoading.value = true
      error.value = null

      // Try to find the UUID if entryId is not a UUID
      const supabaseId = await findEntryUUID(entryId, localEntry) || entryId

      const { data, error: fetchError } = await supabase
        .from('entry_revisions')
        .select('*')
        .eq('entry_id', supabaseId)
        .order('version', { ascending: false })

      if (fetchError) {
        // If error is about invalid UUID and we have a non-UUID ID, 
        // the entry probably doesn't exist in Supabase yet
        if (fetchError.message?.includes('invalid input syntax for type uuid') && !isValidUUID(entryId)) {
          console.log('[AuditTrail] Entry not in Supabase (invalid UUID), no revisions available')
          entryRevisions.value = []
          return { success: true, data: [] }
        }
        throw fetchError
      }

      entryRevisions.value = (data || []).map(revision => ({
        ...revision,
        ...formatTimestamp(revision.created_at)
      }))

      return { success: true, data: entryRevisions.value }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch entry revisions'
      error.value = errorMessage
      console.error('Error fetching entry revisions:', err)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // Restore an entry to a specific revision version
  const restoreRevision = async (entryId: string, version: number, localEntry?: any) => {
    try {
      isLoading.value = true
      error.value = null

      // Try to find the UUID if entryId is not a UUID
      const supabaseId = await findEntryUUID(entryId, localEntry) || entryId

      // First, get the revision data
      const { data: revision, error: revisionError } = await supabase
        .from('entry_revisions')
        .select('*')
        .eq('entry_id', supabaseId)
        .eq('version', version)
        .single()

      if (revisionError || !revision) {
        throw new Error('Revision not found')
      }

      // Extract entry data from revision
      const entryData = revision.entry_data as any

      // Update the entry with revision data
      // Exclude fields that shouldn't be restored (id, user_id, created_at, version, data_hash)
      const { error: updateError } = await supabase
        .from('log_entries')
        .update({
          date: entryData.date,
          role: entryData.role,
          aircraft_category_class: entryData.aircraft_category_class,
          category_class_time: entryData.category_class_time,
          aircraft_make_model: entryData.aircraft_make_model,
          registration: entryData.registration,
          flight_number: entryData.flight_number,
          departure: entryData.departure,
          destination: entryData.destination,
          route: entryData.route,
          training_elements: entryData.training_elements,
          training_instructor: entryData.training_instructor,
          instructor_certificate: entryData.instructor_certificate,
          flight_conditions: entryData.flight_conditions || [],
          remarks: entryData.remarks,
          flight_time: entryData.flight_time,
          performance: entryData.performance,
          oooi: entryData.oooi,
          flagged: entryData.flagged,
          // Preserve import tracking fields
          is_imported: entryData.is_imported,
          import_source: entryData.import_source,
          import_batch_id: entryData.import_batch_id,
          original_entry_date: entryData.original_entry_date,
          import_metadata: entryData.import_metadata
        })
        .eq('id', supabaseId)

      if (updateError) {
        throw updateError
      }

      // Refresh audit logs to show the restore action
      await getAuditLogs(entryId)

      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore revision'
      error.value = errorMessage
      console.error('Error restoring revision:', err)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // Get changed fields diff for display
  const getFieldDiff = (oldData: any, newData: any, changedFields: string[]) => {
    const diffs: Array<{ field: string; oldValue: any; newValue: any }> = []

    changedFields.forEach(field => {
      const oldValue = oldData?.[field]
      const newValue = newData?.[field]

      // Handle nested objects (flight_time, performance, oooi)
      if (typeof oldValue === 'object' && oldValue !== null || typeof newValue === 'object' && newValue !== null) {
        // For nested objects, show JSON diff
        diffs.push({
          field,
          oldValue: oldValue ? JSON.stringify(oldValue, null, 2) : null,
          newValue: newValue ? JSON.stringify(newValue, null, 2) : null
        })
      } else {
        diffs.push({
          field,
          oldValue: oldValue ?? null,
          newValue: newValue ?? null
        })
      }
    })

    return diffs
  }

  return {
    auditLogs,
    entryRevisions,
    isLoading,
    error,
    isEntrySynced,
    getAuditLogs,
    getEntryRevisions,
    restoreRevision,
    getFieldDiff
  }
}


