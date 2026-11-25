import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Row = Record<string, any>

const server = {
  rows: new Map<string, Row>(),
  failUpdates: 0,
  insertCalls: 0,
  updateCalls: [] as Row[],
  onInsert: null as null | (() => Promise<void>),
}

const offlineState = { isOnline: false }
const sessionState = { userId: '' }

function runQuery(state: { op: string; payload: any; filters: [string, unknown][] }, single: boolean) {
  const matches = () =>
    [...server.rows.values()].filter((row) => state.filters.every(([col, val]) => row[col] === val))

  if (state.op === 'insert') {
    server.insertCalls++
    const row = state.payload as Row
    if (server.rows.has(row.id)) {
      return { data: null, error: { code: '23505', message: 'duplicate key', details: '' } }
    }
    const stored = { ...row, version: 1, data_hash: 'hash-1' }
    server.rows.set(row.id, stored)
    return { data: stored, error: null }
  }
  if (state.op === 'update') {
    if (server.failUpdates > 0) {
      server.failUpdates--
      return { data: null, error: { code: '08006', message: 'network dropped', details: '' } }
    }
    server.updateCalls.push(state.payload)
    const hit = matches()
    for (const row of hit) {
      Object.assign(row, state.payload, { version: (row.version ?? 0) + 1 })
    }
    return { data: single ? (hit[0] ?? null) : hit, error: null }
  }
  if (state.op === 'delete') {
    for (const row of matches()) server.rows.delete(row.id)
    return { data: null, error: null }
  }
  const hit = matches()
  return { data: single ? (hit[0] ?? null) : hit, error: null }
}

function from(_table: string) {
  const state = { op: 'select', payload: null as any, filters: [] as [string, unknown][] }
  const run = async (single: boolean) => {
    if (state.op === 'insert' && server.onInsert) await server.onInsert()
    return runQuery(state, single)
  }
  const api: any = {
    select: () => api,
    insert: (payload: any) => ((state.op = 'insert'), (state.payload = payload), api),
    update: (payload: any) => ((state.op = 'update'), (state.payload = payload), api),
    delete: () => ((state.op = 'delete'), api),
    eq: (col: string, val: unknown) => (state.filters.push([col, val]), api),
    limit: () => api,
    order: () => api,
    maybeSingle: () => run(true),
    single: () => run(true),
    then: (resolve: any, reject: any) => run(false).then(resolve, reject),
  }
  return api
}

vi.mock('~/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: sessionState.userId } } } }),
    },
    from,
  },
}))

vi.mock('../useOffline', () => ({
  useOffline: () => ({
    isOnline: {
      get value() {
        return offlineState.isOnline
      },
    },
    checkOnlineStatus: async () => undefined,
    resetSyncProgress: () => undefined,
    updateSyncProgress: () => undefined,
  }),
}))

vi.mock('~/utils/logEntryInboundSync', () => ({
  insertLogEntryTombstone: vi.fn(async () => undefined),
}))

let userSeq = 0
const ENTRY_ID = '00000000-0000-4000-8000-0000000000a1'

function row(userId: string, total: number, extra: Row = {}): Row {
  return {
    id: ENTRY_ID,
    user_id: userId,
    date: '2026-03-14',
    registration: 'N100AA',
    departure: 'KAAA',
    destination: 'KBBB',
    flight_time: { total },
    remarks: null,
    ...extra,
  }
}

async function setup() {
  userSeq++
  const userId = `00000000-0000-4000-8000-${String(userSeq).padStart(12, '0')}`
  sessionState.userId = userId
  vi.resetModules()
  const idb = await import('~/utils/indexedDB')
  const { useSyncQueue } = await import('../useSyncQueue')
  const queue = useSyncQueue()
  queue.setActiveUserId(userId)
  return { userId, idb, queue }
}

describe('useSyncQueue coalescing and ordering', () => {
  beforeEach(() => {
    server.rows.clear()
    server.failUpdates = 0
    server.insertCalls = 0
    server.updateCalls = []
    server.onInsert = null
    offlineState.isOnline = false
  })

  it('offline add 1.0 then edit to 1.5: server gets one row with 1.5', async () => {
    const { userId, idb, queue } = await setup()

    await queue.addToQueue('insert', ENTRY_ID, row(userId, 1.0), userId)
    // The inline edit of a never-synced entry queues another insert with the full row.
    await queue.addToQueue('insert', ENTRY_ID, row(userId, 1.5), userId)
    expect(await idb.getSyncQueue(userId)).toHaveLength(1)

    offlineState.isOnline = true
    await queue.processQueue({ silent: true })

    expect(server.rows.size).toBe(1)
    expect(server.rows.get(ENTRY_ID)?.flight_time).toEqual({ total: 1.5 })
    expect(server.insertCalls).toBe(1)
    expect(await idb.getSyncQueue(userId)).toHaveLength(0)
  })

  it('merges an offline update into the pending insert without losing insert-only fields', async () => {
    const { userId, idb, queue } = await setup()

    await queue.addToQueue('insert', ENTRY_ID, row(userId, 1.0, { import_source: 'logbook_builder' }), userId)
    await queue.addToQueue('update', ENTRY_ID, { flight_time: { total: 1.5 }, remarks: 'edited' }, userId)

    const pending = await idb.getSyncQueue(userId)
    expect(pending).toHaveLength(1)
    expect(pending[0]!.operation).toBe('insert')

    offlineState.isOnline = true
    await queue.processQueue({ silent: true })

    const stored = server.rows.get(ENTRY_ID)
    expect(stored?.flight_time).toEqual({ total: 1.5 })
    expect(stored?.remarks).toBe('edited')
    expect(stored?.import_source).toBe('logbook_builder')
  })

  it('two offline edits of a synced flight: the newer one wins', async () => {
    const { userId, idb, queue } = await setup()
    server.rows.set(ENTRY_ID, { ...row(userId, 1.0), version: 1 })

    await queue.addToQueue('update', ENTRY_ID, { flight_time: { total: 1.2 } }, userId)
    // Second offline edit of an entry that is now unsynced locally takes the insert branch.
    await queue.addToQueue('insert', ENTRY_ID, row(userId, 1.5), userId)
    const pending = await idb.getSyncQueue(userId)
    expect(pending).toHaveLength(1)
    expect(pending[0]!.operation).toBe('update')

    offlineState.isOnline = true
    await queue.processQueue({ silent: true })

    expect(server.rows.size).toBe(1)
    expect(server.rows.get(ENTRY_ID)?.flight_time).toEqual({ total: 1.5 })
  })

  it('keeps an edit made while its insert is in flight and sends it as an update', async () => {
    const { userId, idb, queue } = await setup()
    await queue.addToQueue('insert', ENTRY_ID, row(userId, 1.0), userId)

    server.onInsert = async () => {
      server.onInsert = null
      await idb.addToSyncQueue('update', ENTRY_ID, userId, { flight_time: { total: 1.5 } })
    }
    offlineState.isOnline = true
    await queue.processQueue({ silent: true })

    const pending = await idb.getSyncQueue(userId)
    expect(pending).toHaveLength(1)
    expect(pending[0]!.operation).toBe('update')

    await queue.processQueue({ silent: true })
    expect(server.rows.get(ENTRY_ID)?.flight_time).toEqual({ total: 1.5 })
    expect(await idb.getSyncQueue(userId)).toHaveLength(0)
  })

  it('pushes merged edits when the insert already landed but the queue item survived', async () => {
    const { userId, idb, queue } = await setup()
    // First attempt reached the server but the response was lost; then the pilot edited offline.
    server.rows.set(ENTRY_ID, { ...row(userId, 1.0), version: 1 })
    await queue.addToQueue('insert', ENTRY_ID, row(userId, 1.0), userId)
    await queue.addToQueue('update', ENTRY_ID, { flight_time: { total: 1.5 } }, userId)

    offlineState.isOnline = true
    await queue.processQueue({ silent: true })

    expect(server.rows.size).toBe(1)
    expect(server.rows.get(ENTRY_ID)?.flight_time).toEqual({ total: 1.5 })
    expect(await idb.getSyncQueue(userId)).toHaveLength(0)
  })

  it('a delete replaces pending writes for the entry', async () => {
    const { userId, idb, queue } = await setup()
    await queue.addToQueue('insert', ENTRY_ID, row(userId, 1.0), userId)
    await queue.addToQueue('delete', ENTRY_ID, undefined, userId)

    const pending = await idb.getSyncQueue(userId)
    expect(pending.map((p) => p.operation)).toEqual(['delete'])
  })
})
