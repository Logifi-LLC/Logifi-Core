import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useLogbookBuilderGrid } from '../../app/composables/useLogbookBuilderGrid'

const { saveEntryToIndexedDB, addToQueue, clearBuilderDraft } = vi.hoisted(() => ({
  saveEntryToIndexedDB: vi.fn(),
  addToQueue: vi.fn(async () => undefined),
  clearBuilderDraft: vi.fn(),
}))

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: ref(true), user: ref({ id: 'user-1' }) }),
}))

vi.mock('~/composables/useValidation', () => ({
  useValidation: () => ({ validateEntry: async () => [] }),
}))

vi.mock('~/composables/useSyncQueue', () => ({
  useSyncQueue: () => ({ addToQueue }),
}))

vi.mock('~/composables/useLogbookBuilderDraft', () => ({ clearBuilderDraft }))

vi.mock('~/utils/indexedDB', () => ({
  initIndexedDB: vi.fn(async () => undefined),
  getAllEntriesFromIndexedDB: vi.fn(async () => []),
  saveEntryToIndexedDB,
  getSyncQueue: vi.fn(async () => []),
  updateSyncQueueEntry: vi.fn(),
  getEntryFromIndexedDB: vi.fn(async () => null),
  updateEntryInIndexedDB: vi.fn(),
}))

vi.mock('~/lib/supabase', () => {
  const chain: any = {
    insert: () => chain,
    update: () => chain,
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    single: async () => ({ data: { id: 'batch-1' }, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
    then: (resolve: any) => resolve({ data: null, error: null }),
  }
  return { supabase: { from: () => chain } }
})

function fillRow(grid: ReturnType<typeof useLogbookBuilderGrid>, index: number, date: string) {
  const byKey = (key: string) => grid.columns.value.find((col) => col.fieldKey === key)!.id
  const row = grid.rows.value[index]!
  row.cells[byKey('date')] = date
  row.cells[byKey('departure')] = 'KSEA'
  row.cells[byKey('total')] = '1.0'
}

describe('runValidateAndImport partial failure', () => {
  beforeEach(() => {
    saveEntryToIndexedDB.mockReset()
    addToQueue.mockClear()
    clearBuilderDraft.mockClear()
  })

  it('keeps the rows that failed to save and blanks only the saved ones', async () => {
    const { runValidateAndImport } = await import('../../app/composables/useLogbookBuilderImport')
    const grid = useLogbookBuilderGrid()
    fillRow(grid, 0, '2026-01-05')
    fillRow(grid, 1, '2026-01-06')
    fillRow(grid, 2, '2026-01-07')
    const dateCol = grid.columns.value.find((col) => col.fieldKey === 'date')!.id

    saveEntryToIndexedDB
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('QuotaExceededError'))
      .mockResolvedValueOnce(undefined)

    const result = await runValidateAndImport(grid)

    expect(result.imported).toBe(2)
    expect(result.errors).toHaveLength(1)
    expect(clearBuilderDraft).not.toHaveBeenCalled()
    expect(grid.rows.value.map((row) => row.cells[dateCol])).toEqual([
      '',
      '2026-01-06',
      '',
      ...grid.rows.value.slice(3).map(() => ''),
    ])
  })

  it('clears the grid and draft when every row saves', async () => {
    const { runValidateAndImport } = await import('../../app/composables/useLogbookBuilderImport')
    const grid = useLogbookBuilderGrid()
    fillRow(grid, 0, '2026-01-05')
    saveEntryToIndexedDB.mockResolvedValue(undefined)

    const result = await runValidateAndImport(grid)

    expect(result.errors).toEqual([])
    expect(clearBuilderDraft).toHaveBeenCalledWith('user-1')
  })
})
