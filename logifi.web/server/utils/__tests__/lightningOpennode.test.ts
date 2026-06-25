import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  buildLightningCheckoutSuccessUrl,
  encodeDigifiOrderId,
  parseDigifiOrderId,
  resolveLightningReturnDestination,
  resolveOpennodePublicOrigin,
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

describe('buildLightningCheckoutSuccessUrl / resolveLightningReturnDestination', () => {
  it('builds a public return URL that redirects to localhost logbook-builder', () => {
    const successUrl = buildLightningCheckoutSuccessUrl({
      publicOrigin: 'https://abc.ngrok-free.app',
      requestOrigin: 'https://localhost:3000',
    })
    expect(successUrl).toContain('https://abc.ngrok-free.app/api/credits/checkout/lightning/return?r=')
    expect(successUrl).not.toContain('localhost')

    const token = new URL(successUrl).searchParams.get('r')
    expect(resolveLightningReturnDestination(token ?? undefined)).toBe(
      'https://localhost:3000/logbook-builder?digifi=open&credits=success'
    )
  })

  it('rejects tunnel hosts and non-logbook paths', () => {
    const tunnelDest = Buffer.from(
      'https://evil.trycloudflare.com/logbook-builder?digifi=open&credits=success',
      'utf8'
    ).toString('base64url')
    expect(resolveLightningReturnDestination(tunnelDest)).toBeNull()

    const settingsDest = Buffer.from('https://localhost:3000/settings', 'utf8').toString('base64url')
    expect(resolveLightningReturnDestination(settingsDest)).toBeNull()
  })
})

describe('resolveOpennodePublicOrigin', () => {
  it('uses OPENNODE_CALLBACK_ORIGIN when set', () => {
    expect(
      resolveOpennodePublicOrigin({
        opennodeCallbackOrigin: 'https://abc.ngrok-free.app',
        requestOrigin: 'https://localhost:3000',
      })
    ).toBe('https://abc.ngrok-free.app')
  })

  it('rejects localhost when no public callback origin is configured', () => {
    let caught: unknown
    try {
      resolveOpennodePublicOrigin({
        opennodeCallbackOrigin: '',
        requestOrigin: 'https://localhost:3000',
      })
    } catch (err) {
      caught = err
    }
    expect(caught).toMatchObject({ statusCode: 503 })
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
