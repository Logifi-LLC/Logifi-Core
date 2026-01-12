import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useExport } from '../useExport'
import type { LogEntry } from '~/utils/logbookTypes'
import type { Database } from '~/types/database'

type AuditLog = Database['public']['Tables']['audit_logs']['Row']

// Mock supabase
const mockSupabaseFrom = vi.fn()
const mockSupabaseSelect = vi.fn().mockReturnThis()
const mockSupabaseIn = vi.fn().mockReturnThis()
const mockSupabaseOrder = vi.fn().mockReturnThis()

vi.mock('~/lib/supabase', () => ({
  supabase: {
    from: mockSupabaseFrom
  }
}))

describe('useExport', () => {
  const createTestEntry = (overrides: Partial<LogEntry>): LogEntry => ({
    id: 'test-id',
    date: '2024-01-01',
    role: 'PIC',
    aircraftCategoryClass: 'Airplane SEL',
    categoryClassTime: null,
    aircraftMakeModel: 'C172',
    registration: 'N12345',
    flightNumber: null,
    departure: 'KJFK',
    destination: 'KLGA',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: [],
    remarks: '',
    flightTime: {
      total: 1.5,
      pic: 1.5,
      sic: null,
      dual: null,
      solo: null,
      night: null,
      actualInstrument: null,
      simulatedInstrument: null,
      crossCountry: null
    },
    performance: {
      dayTakeoffs: 0,
      dayLandings: 0,
      nightTakeoffs: null,
      nightLandings: null,
      approachCount: null,
      holdingProcedures: null
    },
    ...overrides
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      in: mockSupabaseIn,
      order: mockSupabaseOrder
    })
  })

  it('should fetch audit trail for entries', async () => {
    const { fetchAuditTrailForEntries } = useExport()
    
    const mockAuditLogs: AuditLog[] = [
      {
        id: 'log-1',
        entry_id: 'entry-1',
        action: 'insert',
        timestamp: '2024-01-01T00:00:00Z',
        user_id: 'user-1',
        changed_fields: null,
        old_data: null,
        new_data: null,
        is_compliance_event: false
      }
    ]
    
    mockSupabaseOrder.mockResolvedValue({
      data: mockAuditLogs,
      error: null
    })
    
    const result = await fetchAuditTrailForEntries(['entry-1'])
    
    expect(result).toBeInstanceOf(Map)
    expect(mockSupabaseFrom).toHaveBeenCalledWith('audit_logs')
  })

  it('should return empty map when no entry IDs provided', async () => {
    const { fetchAuditTrailForEntries } = useExport()
    
    const result = await fetchAuditTrailForEntries([])
    
    expect(result).toBeInstanceOf(Map)
    expect(result.size).toBe(0)
    expect(mockSupabaseFrom).not.toHaveBeenCalled()
  })

  it('should handle errors when fetching audit trail', async () => {
    const { fetchAuditTrailForEntries } = useExport()
    
    mockSupabaseOrder.mockResolvedValue({
      data: null,
      error: { message: 'Database error' }
    })
    
    const result = await fetchAuditTrailForEntries(['entry-1'])
    
    // Should return empty map on error
    expect(result).toBeInstanceOf(Map)
    expect(result.size).toBe(0)
  })

  it('should prepare entry for export', () => {
    const { prepareEntryForExport } = useExport()
    
    const entry = createTestEntry({
      id: 'entry-1',
      version: 1,
      dataHash: 'hash123',
      isImported: true,
      importSource: 'csv'
    })
    
    const result = prepareEntryForExport(entry)
    
    expect(result.id).toBe('entry-1')
    expect(result.metadata).toBeDefined()
    expect(result.metadata.isImported).toBe(true)
    expect(result.integrity).toBeDefined()
    expect(result.integrity.version).toBe(1)
    expect(result.auditTrail).toEqual([])
  })

  it('should include audit trail when provided', () => {
    const { prepareEntryForExport } = useExport()
    
    const entry = createTestEntry({ id: 'entry-1' })
    const auditLogs: AuditLog[] = [
      {
        id: 'log-1',
        entry_id: 'entry-1',
        action: 'update',
        timestamp: '2024-01-01T00:00:00Z',
        user_id: 'user-1',
        changed_fields: { date: true },
        old_data: { date: '2024-01-01' },
        new_data: { date: '2024-01-02' },
        is_compliance_event: false
      }
    ]
    
    const result = prepareEntryForExport(entry, auditLogs)
    
    expect(result.auditTrail).toBeDefined()
    expect(result.auditTrail.length).toBe(1)
    expect(result.auditTrail[0].action).toBe('update')
  })

  it('should batch prepare entries for export', async () => {
    const { batchPrepareEntriesForExport } = useExport()
    
    const entries: LogEntry[] = [
      createTestEntry({ id: 'entry-1' }),
      createTestEntry({ id: 'entry-2' })
    ]
    
    mockSupabaseOrder.mockResolvedValue({
      data: [],
      error: null
    })
    
    const result = await batchPrepareEntriesForExport(entries, false)
    
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(2)
  })
})
