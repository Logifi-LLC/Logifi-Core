import { describe, it, expect } from 'vitest'
import {
  classifyIapPurchaseFailure,
  isIapAlreadyGrantedError,
  isIapUserCancelled,
  IapPurchaseCancelledError,
  normalizeIapVerifyResponse,
} from '../iapPurchaseOutcome'

describe('iapPurchaseOutcome', () => {
  it('normalizes verify response with explicit outcome', () => {
    expect(
      normalizeIapVerifyResponse({
        ok: true,
        credits: 50,
        granted: false,
        outcome: 'already_granted',
      })
    ).toEqual({
      ok: true,
      credits: 50,
      granted: false,
      outcome: 'already_granted',
    })
  })

  it('infers already_granted when granted is false and outcome omitted', () => {
    expect(
      normalizeIapVerifyResponse({
        ok: true,
        credits: 25,
        granted: false,
      }).outcome
    ).toBe('already_granted')
  })

  it('detects user cancellation from native plugin message', () => {
    expect(isIapUserCancelled(new Error('User cancelled'))).toBe(true)
    expect(isIapUserCancelled(new IapPurchaseCancelledError())).toBe(true)
    expect(classifyIapPurchaseFailure(new Error('User cancelled'))).toBe('cancelled')
  })

  it('detects structured already_granted server code', () => {
    const err = { data: { code: 'already_granted', statusMessage: 'Duplicate' } }
    expect(isIapAlreadyGrantedError(err)).toBe(true)
    expect(classifyIapPurchaseFailure(err)).toBe('already_granted')
  })

  it('treats unknown failures as errors', () => {
    expect(classifyIapPurchaseFailure(new Error('Invalid signature'))).toBe('error')
  })
})
