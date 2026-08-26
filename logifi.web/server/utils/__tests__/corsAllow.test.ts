import { describe, expect, it } from 'vitest'
import {
  isCapacitorApiOrigin,
  resolveCorsAllowHeaders,
} from '../corsAllow'

describe('isCapacitorApiOrigin', () => {
  it('allows Capacitor WebView origins', () => {
    expect(isCapacitorApiOrigin('https://localhost')).toBe(true)
    expect(isCapacitorApiOrigin('http://localhost')).toBe(true)
    expect(isCapacitorApiOrigin('capacitor://localhost')).toBe(true)
    expect(isCapacitorApiOrigin('ionic://localhost')).toBe(true)
  })

  it('rejects missing or web origins', () => {
    expect(isCapacitorApiOrigin(undefined)).toBe(false)
    expect(isCapacitorApiOrigin('https://www.logifi.io')).toBe(false)
    expect(isCapacitorApiOrigin('https://dev.logifi.io')).toBe(false)
  })
})

describe('resolveCorsAllowHeaders', () => {
  it('always allows Authorization, Content-Type, and Accept', () => {
    expect(resolveCorsAllowHeaders()).toBe('authorization, content-type, accept')
  })

  it('echoes Safari preflight headers so Accept does not fail CORS', () => {
    expect(resolveCorsAllowHeaders('accept, authorization, content-type')).toBe(
      'authorization, content-type, accept'
    )
  })

  it('unions extra requested headers onto the defaults', () => {
    expect(resolveCorsAllowHeaders('X-Requested-With')).toBe(
      'authorization, content-type, accept, x-requested-with'
    )
  })
})
