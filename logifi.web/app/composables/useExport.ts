import { supabase } from '~/lib/supabase'
import type { Database } from '~/types/database'
import type { LogEntry } from '~/utils/logbookTypes'

type AuditLog = Database['public']['Tables']['audit_logs']['Row']

export interface ExportOptions {
  includeMetadata?: boolean
  includeHashes?: boolean
  includeAuditTrail?: boolean
}

/**
 * Composable for export functionality
 * Handles fetching audit trail data and preparing entries for export
 */
export const useExport = () => {
  /**
   * Batch fetch audit logs for multiple entries
   * @param entryIds Array of entry IDs to fetch audit logs for
   * @returns Map of entry ID to audit logs array
   */
  const fetchAuditTrailForEntries = async (
    entryIds: string[]
  ): Promise<Map<string, AuditLog[]>> => {
    if (entryIds.length === 0) {
      return new Map()
    }

    try {
      // Fetch all audit logs for the given entry IDs
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .in('entry_id', entryIds)
        .order('timestamp', { ascending: false })

      if (error) {
        console.error('Error fetching audit trail:', error)
        return new Map()
      }

      // Group audit logs by entry ID
      const auditLogMap = new Map<string, AuditLog[]>()
      ;(data || []).forEach((log) => {
        const entryId = log.entry_id
        if (!auditLogMap.has(entryId)) {
          auditLogMap.set(entryId, [])
        }
        auditLogMap.get(entryId)!.push(log)
      })

      return auditLogMap
    } catch (err) {
      console.error('Error fetching audit trail for entries:', err)
      return new Map()
    }
  }

  /**
   * Prepare a single entry for export with audit trail
   * @param entry The log entry to prepare
   * @param auditLogs Optional audit logs for this entry
   * @returns Enriched entry object
   */
  const prepareEntryForExport = (
    entry: LogEntry,
    auditLogs?: AuditLog[]
  ): any => {
    const exportEntry: any = {
      id: entry.id,
      date: entry.date,
      role: entry.role,
      aircraftCategoryClass: entry.aircraftCategoryClass,
      categoryClassTime: entry.categoryClassTime,
      aircraftMakeModel: entry.aircraftMakeModel,
      registration: entry.registration,
      flightNumber: entry.flightNumber,
      departure: entry.departure,
      destination: entry.destination,
      route: entry.route,
      trainingElements: entry.trainingElements,
      trainingInstructor: entry.trainingInstructor,
      instructorCertificate: entry.instructorCertificate,
      flightConditions: entry.flightConditions,
      remarks: entry.remarks,
      flightTime: entry.flightTime,
      performance: entry.performance,
      oooi: entry.oooi,
      flagged: entry.flagged
    }

    // Add metadata if available
    if (
      entry.isImported !== undefined ||
      entry.importSource ||
      entry.importBatchId ||
      entry.originalEntryDate ||
      entry.importMetadata
    ) {
      exportEntry.metadata = {
        isImported: entry.isImported || false,
        importSource: entry.importSource || null,
        importBatchId: entry.importBatchId || null,
        originalEntryDate: entry.originalEntryDate || null,
        importMetadata: entry.importMetadata || null
      }
    }

    // Add integrity fields if available
    if (
      entry.version !== undefined ||
      entry.dataHash ||
      entry.createdAt ||
      entry.updatedAt
    ) {
      exportEntry.integrity = {
        version: entry.version || null,
        dataHash: entry.dataHash || null,
        createdAt: entry.createdAt || null,
        updatedAt: entry.updatedAt || null
      }
    }

    // Add audit trail if provided
    if (auditLogs && auditLogs.length > 0) {
      exportEntry.auditTrail = auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        timestamp: log.timestamp,
        user_id: log.user_id,
        changed_fields: log.changed_fields,
        old_data: log.old_data,
        new_data: log.new_data,
        is_compliance_event: log.is_compliance_event
      }))
    } else {
      exportEntry.auditTrail = []
    }

    return exportEntry
  }

  /**
   * Batch prepare entries for export with audit trail
   * @param entries Array of entries to prepare
   * @param includeAuditTrail Whether to fetch and include audit trail
   * @returns Array of prepared entries
   */
  const prepareEntriesForExport = async (
    entries: LogEntry[],
    includeAuditTrail: boolean = true
  ): Promise<any[]> => {
    let auditLogMap = new Map<string, AuditLog[]>()

    if (includeAuditTrail && entries.length > 0) {
      const entryIds = entries.map((e) => e.id)
      auditLogMap = await fetchAuditTrailForEntries(entryIds)
    }

    return entries.map((entry) => {
      const auditLogs = auditLogMap.get(entry.id)
      return prepareEntryForExport(entry, auditLogs)
    })
  }

  return {
    fetchAuditTrailForEntries,
    prepareEntryForExport,
    prepareEntriesForExport
  }
}

