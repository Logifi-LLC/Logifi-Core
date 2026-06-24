import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  encodeDigifiOrderId,
  parseDigifiOrderId,
  verifyOpennodeWebhookSignature,
} from '../lightningOpennode'

describe('encodeDigifiOrderId / parseDigifiOrderId', () => {
  it('round-trips userId and numberOfCredits', () => {
    const encoded = encodeDigifiOrderId('user-abc', 10)
    expect(encoded).toBe('digifi_credits|user-abc|10')

    const parsed = parseDigifiOrderId(encoded)
    expect(parsed).toEqual({
      purpose: 'digifi_credits',
      userId: 'user-abc',
      numberOfCredits: 10,
    })
  })

  it('returns null for invalid order_id formats', () => {
    expect(parseDigifiOrderId('')).toBeNull()
    expect(parseDigifiOrderId('other|user|5')).toBeNull()
    expect(parseDigifiOrderId('digifi_credits|user|0')).toBeNull()
    expect(parseDigifiOrderId('digifi_credits||5')).toBeNull()
    expect(parseDigifiOrderId('digifi_credits|user|abc')).toBeNull()
  })
})

describe('verifyOpennodeWebhookSignature', () => {
  const apiKey = 'test-api-key-123'
  const chargeId = 'charge-uuid-456'
  const hashedOrder = createHmac('sha256', apiKey).update(chargeId).digest('hex')

  it('accepts a valid hashed_order', () => {
    expect(verifyOpennodeWebhookSignature(chargeId, hashedOrder, apiKey)).toBe(true)
  })

  it('rejects an invalid hashed_order', () => {
    expect(verifyOpennodeWebhookSignature(chargeId, 'deadbeef', apiKey)).toBe(false)
    expect(verifyOpennodeWebhookSignature(chargeId, hashedOrder, 'wrong-key')).toBe(false)
    expect(verifyOpennodeWebhookSignature('', hashedOrder, apiKey)).toBe(false)
  })
})
