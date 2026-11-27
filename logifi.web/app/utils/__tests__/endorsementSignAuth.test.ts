import { describe, expect, it } from 'vitest'
import { canSignEndorsementLocally } from '../endorsementSignAuth'

describe('canSignEndorsementLocally', () => {
  it('rejects students', () => {
    const result = canSignEndorsementLocally({
      callerUserId: 'u1',
      instructorId: 'u1',
      role: 'STUDENT',
    })
    expect(result.allowed).toBe(false)
  })

  it('rejects instructor who is not assigned', () => {
    const result = canSignEndorsementLocally({
      callerUserId: 'u1',
      instructorId: 'u2',
      role: 'INSTRUCTOR',
    })
    expect(result.allowed).toBe(false)
  })

  it('allows assigned CFI', () => {
    const result = canSignEndorsementLocally({
      callerUserId: 'u1',
      instructorId: 'u1',
      role: 'DUAL',
    })
    expect(result.allowed).toBe(true)
  })
})