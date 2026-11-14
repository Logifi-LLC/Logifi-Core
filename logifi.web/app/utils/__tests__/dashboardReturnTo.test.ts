import { describe, expect, it } from 'vitest'
import { parseDashboardReturnTo } from '../dashboardReturnTo'

describe('dashboardReturnTo', () => {
  it('maps allowlisted returnTo tokens to app routes', () => {
    expect(parseDashboardReturnTo('logbook-check')).toBe('/logbook-check')
    expect(parseDashboardReturnTo(['logbook-check'])).toBe('/logbook-check')
  })

  it('rejects unknown or unsafe return targets', () => {
    expect(parseDashboardReturnTo('https://evil.example')).toBeNull()
    expect(parseDashboardReturnTo('/logbook-check')).toBeNull()
    expect(parseDashboardReturnTo('')).toBeNull()
    expect(parseDashboardReturnTo(undefined)).toBeNull()
  })
})
