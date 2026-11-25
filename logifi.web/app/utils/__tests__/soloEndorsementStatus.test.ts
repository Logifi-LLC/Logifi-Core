import { describe, expect, it } from 'vitest'
import { pickActiveSoloEndorsement } from '../soloEndorsementStatus'

describe('pickActiveSoloEndorsement', () => {
  const ref = new Date('2026-06-01T12:00:00')

  it('returns soonest-expiring active solo endorsement', () => {
    const picked = pickActiveSoloEndorsement(
      [
        {
          status: 'signed',
          template_code: 'A.6',
          title: 'A.6 Solo',
          expires_at: '2026-08-01T00:00:00Z',
        },
        {
          status: 'signed',
          template_code: 'A.7',
          title: 'A.7 Solo',
          expires_at: '2026-07-01T00:00:00Z',
        },
      ],
      ref
    )
    expect(picked?.title).toContain('A.7')
    expect(picked?.expiringSoon).toBe(true)
  })

  it('ignores expired and unsigned rows', () => {
    expect(
      pickActiveSoloEndorsement(
        [
          { status: 'draft', template_code: 'A.6', expires_at: '2026-12-01T00:00:00Z' },
          { status: 'signed', template_code: 'A.6', expires_at: '2026-01-01T00:00:00Z' },
        ],
        ref
      )
    ).toBeNull()
  })
})