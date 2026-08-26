import { describe, expect, it } from 'vitest'
import { canonicalizeApiBase, LIVE_IOS_API_BASE } from '../apiBase'

describe('canonicalizeApiBase', () => {
  it('maps the unrouted TestFlight host to production', () => {
    expect(canonicalizeApiBase('https://dev.logifi.io')).toBe(LIVE_IOS_API_BASE)
    expect(canonicalizeApiBase('https://dev.logifi.io/')).toBe(LIVE_IOS_API_BASE)
    expect(canonicalizeApiBase('HTTP://DEV.LOGIFI.IO')).toBe(LIVE_IOS_API_BASE)
  })

  it('leaves the live host and empty values alone', () => {
    expect(canonicalizeApiBase('https://www.logifi.io')).toBe('https://www.logifi.io')
    expect(canonicalizeApiBase('https://www.logifi.io/')).toBe('https://www.logifi.io')
    expect(canonicalizeApiBase('')).toBe('')
    expect(canonicalizeApiBase('  ')).toBe('')
  })
})
