import { describe, expect, it } from 'vitest'
import crypto from 'node:crypto'
import { createFcvState, verifyFcvState } from '../fcvState'

const SECRET = 'test-secret'
const USER_ID = 'user-123'

describe('createFcvState / verifyFcvState', () => {
  it('round-trips the user id with native=false by default', () => {
    const state = createFcvState(USER_ID, SECRET)
    expect(verifyFcvState(state, SECRET)).toEqual({ userId: USER_ID, native: false })
  })

  it('preserves the native flag when set', () => {
    const state = createFcvState(USER_ID, SECRET, { native: true })
    expect(verifyFcvState(state, SECRET)).toEqual({ userId: USER_ID, native: true })
  })

  it('rejects states signed with a different secret', () => {
    const state = createFcvState(USER_ID, SECRET)
    expect(verifyFcvState(state, 'other-secret')).toBeNull()
  })

  it('rejects tampered payloads', () => {
    const state = createFcvState(USER_ID, SECRET)
    const [, sig] = state.split('.')
    const forgedPayload = Buffer.from(JSON.stringify({ u: 'attacker', n: 1 })).toString('base64url')
    expect(verifyFcvState(`${forgedPayload}.${sig}`, SECRET)).toBeNull()
  })

  it('accepts legacy raw user-id states minted before the platform flag', () => {
    const payload = Buffer.from(USER_ID, 'utf8').toString('base64url')
    const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
    const legacyState = `${payload}.${sig}`
    expect(verifyFcvState(legacyState, SECRET)).toEqual({ userId: USER_ID, native: false })
  })

  it('returns null for malformed input', () => {
    expect(verifyFcvState('', SECRET)).toBeNull()
    expect(verifyFcvState('nodot', SECRET)).toBeNull()
    expect(verifyFcvState(createFcvState(USER_ID, SECRET), '')).toBeNull()
  })
})
