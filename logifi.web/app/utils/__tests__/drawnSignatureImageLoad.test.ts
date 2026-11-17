import { describe, expect, it } from 'vitest'
import { shouldAttemptDrawnSignatureLoad } from '../drawnSignatureImageLoad'

describe('shouldAttemptDrawnSignatureLoad', () => {
  it('is false when the entry is not signed', () => {
    expect(shouldAttemptDrawnSignatureLoad(false, { sign_method: 'guest_drawn', drawn_signature_url: 'a/b.png' })).toBe(
      false
    )
  })

  it('is true when drawn_signature_url is present on the client row', () => {
    expect(
      shouldAttemptDrawnSignatureLoad(true, { sign_method: 'guest_drawn', drawn_signature_url: 'a/b.png' })
    ).toBe(true)
  })

  it('is true for guest_drawn when drawn_signature_url is missing on a stale client row', () => {
    expect(shouldAttemptDrawnSignatureLoad(true, { sign_method: 'guest_drawn', drawn_signature_url: null })).toBe(true)
  })

  it('is false for roster_pin without a drawn path', () => {
    expect(shouldAttemptDrawnSignatureLoad(true, { sign_method: 'roster_pin', drawn_signature_url: null })).toBe(false)
  })
})