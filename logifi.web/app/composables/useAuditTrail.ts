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

  // Fetch audit logs for a specific entry
  const getAuditLogs = async (entryId: string) => {
    try {
      isLoading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entry_id', entryId)
        .order('timestamp', { ascending: false })

      if (fetchError) {
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
  const getEntryRevisions = async (entryId: string) => {
    try {
      isLoading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('entry_revisions')
        .select('*')
        .eq('entry_id', entryId)
        .order('version', { ascending: false })

      if (fetchError) {
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
  const restoreRevision = async (entryId: string, version: number) => {
    try {
      isLoading.value = true
      error.value = null

      // First, get the revision data
      const { data: revision, error: revisionError } = await supabase
        .from('entry_revisions')
        .select('*')
        .eq('entry_id', entryId)
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
        .eq('id', entryId)

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
    getAuditLogs,
    getEntryRevisions,
    restoreRevision,
    getFieldDiff
  }
}


