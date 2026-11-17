import { describe, expect, it } from 'vitest'
import { entryHasDrawnInkSignature } from '../flightSignatureDisplay'

describe('entryHasDrawnInkSignature', () => {
  it('is true for guest_drawn with a storage path', () => {
    expect(
      entryHasDrawnInkSignature({
        sign_method: 'guest_drawn',
        drawn_signature_url: 'user/entry.png',
      })
    ).toBe(true)
  })

  it('is true when sign_method is missing but a path exists (QR / legacy rows)', () => {
    expect(
      entryHasDrawnInkSignature({
        drawn_signature_url: 'user/entry.webp',
      })
    ).toBe(true)
  })

  it('is false for roster_pin without drawn ink', () => {
    expect(
      entryHasDrawnInkSignature({
        sign_method: 'roster_pin',
        drawn_signature_url: null,
      })
    ).toBe(false)
  })
})