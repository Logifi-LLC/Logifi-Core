import { describe, expect, it } from 'vitest'
import { mergeRemoteEndorsements } from '../endorsementMerge'
import type { EndorsementRow } from '~/utils/endorsementIndexedDB'

const baseRow = (overrides: Partial<EndorsementRow>): EndorsementRow => ({
  id: 'e1',
  student_id: 'student',
  instructor_id: 'instructor',
  template_code: 'A.1',
  regulation_refs: '61.65',
  title: 'Test',
  body_template: 'body',
  field_values: {},
  rendered_body: 'rendered',
  status: 'draft',
  expires_at: null,
  signed_at: null,
  signature_hash: null,
  cfi_number: null,
  cfi_expiration: null,
  instructor_full_name: null,
  is_imported: false,
  import_source: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('mergeRemoteEndorsements', () => {
  it('keeps unsynced local create when remote is missing', () => {
    const local = baseRow({ id: 'local-1', status: 'pending' })
    const { merged } = mergeRemoteEndorsements({
      localRows: [local],
      remoteRows: [],
      userId: 'student',
      syncQueue: [
        {
          id: 'q1',
          endorsementId: 'local-1',
          operation: 'request',
          payload: {},
          timestamp: 1,
          retryCount: 0,
          userId: 'student',
        },
      ],
    })
    expect(merged).toHaveLength(1)
    expect(merged[0].id).toBe('local-1')
  })

  it('prefers remote signed over stale local draft', () => {
    const local = baseRow({ status: 'draft', updated_at: '2026-01-01T00:00:00Z' })
    const remote = baseRow({
      status: 'signed',
      signed_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    })
    const { merged } = mergeRemoteEndorsements({
      localRows: [local],
      remoteRows: [remote],
      userId: 'instructor',
      syncQueue: [],
    })
    expect(merged[0].status).toBe('signed')
  })
})