import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { LogEntry } from '../logbookTypes'
import {
  checkDuplicatesInDatabase,
  checkDuplicatesWithLocalFallback,
  findDuplicateEntries,
} from '../duplicateDetection'

vi.mock('~/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('~/utils/promiseTimeout', () => ({
  withTimeout: (promise: Promise<unknown>) => promise,
}))

function buildEntry(id: string, registration = 'N12345'): LogEntry {
  return {
    id,
    date: '2026-05-26',
    role: 'PIC',
    aircraftCategoryClass: 'Airplane Single Engine Land',
    categoryClassTime: null,
    aircraftMakeModel: 'C172',
    registration,
    flightNumber: null,
    departure: 'KJFK',
    destination: 'KLGA',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: [],
    remarks: '',
    tags: [],
    logbookType: 'flight',
    flightTime: { total: 1.2, pic: 1.2, sic: null, dual: null, solo: null, night: null, actualInstrument: null, simulatedInstrument: null, crossCountry: null, dualGiven: null },
    performance: {
      dayTakeoffs: null,
      dayLandings: null,
      nightTakeoffs: null,
      nightLandings: null,
      approachCount: null,
      holdingProcedures: null,
      approaches: [],
    },
    flagged: false,
    isImported: false,
  }
}

describe('duplicateDetection', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('returns local duplicates without waiting for Supabase', async () => {
    const entry = buildEntry('new-entry')
    const localEntries = [buildEntry('existing-entry')]

    const duplicates = await checkDuplicatesWithLocalFallback(
      entry,
      'user-1',
      localEntries
    )

    expect(duplicates).toHaveLength(1)
    expect(duplicates[0]?.id).toBe('existing-entry')
  })

  it('falls back to empty array when Supabase query fails', async () => {
    const { supabase } = await import('~/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            ilike: vi.fn().mockResolvedValue({ data: null, error: new Error('network') }),
          }),
        }),
      }),
    } as never)

    const entry = buildEntry('new-entry', 'N99999')
    const duplicates = await checkDuplicatesInDatabase(entry, 'user-1')

    expect(duplicates).toEqual([])
  })

  it('findDuplicateEntries matches same-day registration entries', () => {
    const entry = buildEntry('candidate')
    const existing = buildEntry('existing')

    expect(findDuplicateEntries(entry, [existing])).toHaveLength(1)
  })
})
