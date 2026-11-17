import { describe, expect, it } from 'vitest'
import {
  canAuthenticatedInstructorSign,
  ownerCannotSignAsInstructorError,
} from '../flightSigningAuth'

describe('sign_log_entry authorization', () => {
  it('does not allow the entry owner to sign as the CFI', () => {
    expect(
      canAuthenticatedInstructorSign({
        callerId: '11111111-1111-1111-1111-111111111111',
        instructorId: '22222222-2222-2222-2222-222222222222',
      })
    ).toBe(false)
    expect(ownerCannotSignAsInstructorError()).toBe('only the instructor can sign this entry')
  })

  it('allows only the authenticated instructor', () => {
    const instructorId = '22222222-2222-2222-2222-222222222222'
    expect(
      canAuthenticatedInstructorSign({
        callerId: instructorId,
        instructorId,
      })
    ).toBe(true)
  })
})
