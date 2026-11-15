import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { convertLogEntryToDb } from '../migrateLocalStorage'
import {
  LOG_ENTRIES_DB_ONLY_COLUMNS,
  LOG_ENTRIES_MAPPED_COLUMNS,
  LOG_ENTRIES_SERVER_OWNED_COLUMNS,
  LOG_ENTRY_MAPPED_KEYS,
  LOG_ENTRY_SERVER_OWNED_KEYS,
  logEntryTagsFromSupabaseRow,
  logEntryToSupabaseRow,
  mapSupabaseRowToLogEntry,
} from '../logEntrySupabaseRow'
import type { LogEntry } from '../logbookTypes'

const USER_ID = '00000000-0000-4000-8000-000000000001'

const here = dirname(fileURLToPath(import.meta.url))

function parseInterfaceKeys(source: string, startToken: string, endToken: string): string[] {
  const start = source.indexOf(startToken)
  if (start < 0) throw new Error(`start token not found: ${startToken}`)
  const from = start + startToken.length
  const end = source.indexOf(endToken, from)
  if (end < 0) throw new Error(`end token not found: ${endToken}`)
  const keys: string[] = []
  for (const line of source.slice(from, end).split('\n')) {
    const trimmed = line.trim()
    if (
      !trimmed
      || trimmed.startsWith('//')
      || trimmed.startsWith('*')
      || trimmed.startsWith('/*')
      || trimmed.startsWith('}')
    ) {
      continue
    }
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\??\s*:/)
    if (match) keys.push(match[1])
  }
  return keys
}

function omitKeys<T extends Record<string, unknown>>(value: T, keys: readonly string[]): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...value }
  for (const key of keys) delete copy[key]
  return copy
}

/** Fully populated fictional LogEntry — never sourced from a real logbook. */
function createFullyPopulatedLogEntry(): LogEntry {
  return {
    id: '00000000-0000-4000-8000-0000000000aa',
    date: '2024-06-15',
    role: 'PIC',
    aircraftCategoryClass: 'AMEL',
    categoryClassTime: 3.7,
    aircraftMakeModel: 'Fictional F-100',
    registration: 'N000FICT',
    flightNumber: 'FICT42',
    departure: 'KAAA',
    destination: 'KBBB',
    route: 'KCCC KDDD',
    trainingElements: 'Steep turns, stalls',
    trainingInstructor: 'Jordan Instructor',
    instructorCertificate: 'CFI-000000',
    picName: 'Alex Captain',
    sicName: 'Sam Firstofficer',
    flightConditions: ['nightVfr', 'ifr', 'actualInstrument', 'crossCountry', 'nvg'],
    remarks: 'Fictional night IFR training flight for mapper coverage.',
    tags: ['Checkride', 'Part 135', 'Turbine'],
    logbookType: 'simulator',
    flightTime: {
      total: 3.7,
      pic: 3.7,
      sic: 1.1,
      dual: 2.2,
      solo: 0.4,
      night: 1.3,
      nvg: 0.6,
      actualInstrument: 1.8,
      dualGiven: 0.9,
      crossCountry: 3.1,
      simulatedInstrument: 0.5,
      ffs: 1.2,
      ftd: 0.8,
      atd: 0.3,
    },
    performance: {
      dayTakeoffs: 2,
      nightTakeoffs: 1,
      dayLandings: 2,
      nightLandings: 1,
      approachCount: 3,
      approachType: 'ILS',
      approaches: [
        { type: 'ILS', count: 2 },
        { type: 'RNAV', count: 1 },
      ],
      holdingProcedures: 1,
    },
    oooi: {
      out: '2024-06-15T01:10:00.000Z',
      off: '2024-06-15T01:22:00.000Z',
      on: '2024-06-15T04:40:00.000Z',
      in: '2024-06-15T04:51:00.000Z',
      isZulu: false,
      tzUnresolved: true,
    },
    flagged: true,
    version: 7,
    dataHash: 'fictional-sha256-not-from-a-real-entry',
    createdAt: '2024-01-02T03:04:05.000Z',
    updatedAt: '2024-06-07T08:09:10.000Z',
    signaturePending: true,
    pendingInstructorId: '00000000-0000-4000-8000-0000000000cf',
    amendsEntryId: '00000000-0000-4000-8000-0000000000bb',
    isVoid: true,
    isImported: true,
    importSource: 'csv',
    importBatchId: '00000000-0000-4000-8000-0000000000cc',
    originalEntryDate: '2024-06-15',
    importMetadata: {
      fileName: 'fictional-logbook.csv',
      importedAt: '2024-06-16T12:00:00.000Z',
    },
  }
}

describe('logEntryTagsFromSupabaseRow', () => {
  it('copies tags from an inline-save update .select() row', () => {
    const updateResult = {
      id: 'fictional-entry-uuid',
      date: '2024-06-01',
      tags: ['Checkride', 'Part 135', 'Turbine'],
    }

    const tags = logEntryTagsFromSupabaseRow(updateResult)

    expect(tags).toEqual(['Checkride', 'Part 135', 'Turbine'])
    expect(tags).not.toBe(updateResult.tags)
  })

  it('returns [] when tags are missing or not an array', () => {
    expect(logEntryTagsFromSupabaseRow({})).toEqual([])
    expect(logEntryTagsFromSupabaseRow({ tags: null })).toEqual([])
    expect(logEntryTagsFromSupabaseRow({ tags: 'Checkride' })).toEqual([])
  })
})

describe('canonical log_entries mapper round-trip', () => {
  it('round-trips a fully populated fictional entry (minus server-owned fields)', () => {
    const original = createFullyPopulatedLogEntry()
    const payload = logEntryToSupabaseRow(original, USER_ID)
    const roundTripped = mapSupabaseRowToLogEntry(payload)

    expect(omitKeys(roundTripped as unknown as Record<string, unknown>, LOG_ENTRY_SERVER_OWNED_KEYS))
      .toEqual(omitKeys(original as unknown as Record<string, unknown>, LOG_ENTRY_SERVER_OWNED_KEYS))
  })

  it('maps server-owned columns when the row includes them', () => {
    const original = createFullyPopulatedLogEntry()
    const payload = logEntryToSupabaseRow(original, USER_ID)
    const row = {
      ...payload,
      created_at: original.createdAt,
      updated_at: original.updatedAt,
      data_hash: original.dataHash,
      version: original.version,
    }

    expect(mapSupabaseRowToLogEntry(row)).toEqual(original)
  })

  it('keeps payload tags distinct from the inbound copy', () => {
    const original = createFullyPopulatedLogEntry()
    const payload = logEntryToSupabaseRow(original, USER_ID)
    const roundTripped = mapSupabaseRowToLogEntry(payload)
    expect(roundTripped.tags).toEqual(original.tags)
    expect(roundTripped.tags).not.toBe(payload.tags)
  })
})

describe('mapper key coverage', () => {
  it('fully populated entry keys match the explicit LogEntry list', () => {
    expect(Object.keys(createFullyPopulatedLogEntry()).sort()).toEqual([...LOG_ENTRY_MAPPED_KEYS].sort())
  })

  it('fails if LogEntry gains a key not in LOG_ENTRY_MAPPED_KEYS', () => {
    const source = readFileSync(resolve(here, '../logbookTypes.ts'), 'utf8')
    const keys = parseInterfaceKeys(
      source,
      'export interface LogEntry {',
      'export type EditableLogEntry',
    )
    expect(keys.sort()).toEqual([...LOG_ENTRY_MAPPED_KEYS].sort())
  })

  it('fails if log_entries Row gains a column not in LOG_ENTRIES_MAPPED_COLUMNS', () => {
    const source = readFileSync(resolve(here, '../../types/database.ts'), 'utf8')
    const tableStart = source.indexOf('log_entries: {')
    expect(tableStart).toBeGreaterThanOrEqual(0)
    const keys = parseInterfaceKeys(
      source.slice(tableStart),
      'Row: {',
      'Insert: {',
    )
    const mapped = new Set<string>(LOG_ENTRIES_MAPPED_COLUMNS)
    const missing = keys.filter((key) => !mapped.has(key))
    expect(missing).toEqual([])
  })

  it('includes schema column logbook_type even though database.ts types omit it', () => {
    expect(LOG_ENTRIES_MAPPED_COLUMNS).toContain('logbook_type')
  })

  it('inbound mapper result keys match the explicit LogEntry list when the row is complete', () => {
    const original = createFullyPopulatedLogEntry()
    const row = {
      ...logEntryToSupabaseRow(original, USER_ID),
      created_at: original.createdAt,
      updated_at: original.updatedAt,
      data_hash: original.dataHash,
      version: original.version,
    }
    expect(Object.keys(mapSupabaseRowToLogEntry(row)).sort()).toEqual([...LOG_ENTRY_MAPPED_KEYS].sort())
  })

  it('outbound payload covers every mapped column except server-owned and fcv_flight_id', () => {
    const payload = logEntryToSupabaseRow(createFullyPopulatedLogEntry(), USER_ID)
    const expected = LOG_ENTRIES_MAPPED_COLUMNS.filter(
      (column) =>
        !(LOG_ENTRIES_SERVER_OWNED_COLUMNS as readonly string[]).includes(column)
        && column !== 'fcv_flight_id',
    )
    expect(Object.keys(payload).sort()).toEqual([...expected].sort())
    expect(payload.user_id).toBe(USER_ID)
    expect(LOG_ENTRIES_DB_ONLY_COLUMNS).toEqual(['user_id', 'fcv_flight_id'])
  })
})

describe('convertLogEntryToDb localStorage migration', () => {
  it('writes tags and logbook_type so a migrate insert cannot drop them', () => {
    const original = createFullyPopulatedLogEntry()
    const row = convertLogEntryToDb(original, USER_ID)
    expect(row.tags).toEqual(['Checkride', 'Part 135', 'Turbine'])
    expect(row.logbook_type).toBe('simulator')
  })
})
