import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initIndexedDB } from '~/utils/indexedDB'
import {
  getAllEndorsementsForUser,
  getEndorsementSyncQueue,
  saveEndorsementToIndexedDB,
} from '~/utils/endorsementIndexedDB'
import { canSignEndorsementLocally } from '~/utils/endorsementSignAuth'

const USER = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const INSTRUCTOR = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

vi.mock('~/lib/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: USER } } } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          neq: () => ({
            order: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    }),
    rpc: vi.fn(),
  },
}))

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    user: { value: { id: USER } },
  }),
}))

vi.mock('~/composables/useOffline', () => ({
  useOffline: () => ({
    isOnline: { value: false },
  }),
}))

describe('endorsements offline cache', () => {
  beforeEach(async () => {
    const db = await initIndexedDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['endorsements', 'endorsement_sync_queue'], 'readwrite')
      tx.objectStore('endorsements').clear()
      tx.objectStore('endorsement_sync_queue').clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  })

  it('loads endorsements from IndexedDB with no network', async () => {
    await saveEndorsementToIndexedDB(
      {
        id: 'offline-1',
        student_id: USER,
        instructor_id: INSTRUCTOR,
        template_code: 'A.1',
        regulation_refs: '',
        title: 'Offline',
        body_template: 'x',
        field_values: {},
        rendered_body: 'x',
        status: 'pending',
        expires_at: null,
        signed_at: null,
        signature_hash: null,
        cfi_number: null,
        cfi_expiration: null,
        instructor_full_name: null,
        is_imported: false,
        import_source: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      USER,
      false
    )
    const rows = await getAllEndorsementsForUser(USER)
    expect(rows).toHaveLength(1)
    expect(rows[0]._synced).toBe(false)
  })

  it('queues sign for upload when offline', async () => {
    const { addToEndorsementSyncQueue } = await import('~/utils/endorsementIndexedDB')
    await addToEndorsementSyncQueue('sign', 'offline-1', INSTRUCTOR, {
      p_endorsement_id: 'offline-1',
      p_pin: '1234',
      p_signed_at: '2026-01-02T12:00:00.000Z',
    })
    const queue = await getEndorsementSyncQueue(INSTRUCTOR)
    expect(queue).toHaveLength(1)
    expect(queue[0].operation).toBe('sign')
  })

  it('rejects non-CFI local sign authorization', () => {
    const result = canSignEndorsementLocally({
      callerUserId: USER,
      instructorId: INSTRUCTOR,
      role: 'STUDENT',
    })
    expect(result.allowed).toBe(false)
  })
})