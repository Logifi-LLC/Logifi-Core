import { describe, expect, it } from 'vitest'
import {
  captureDashboardInlineEditReturn,
  resolveDashboardInlineEditReturnNavigation,
} from '../dashboardInlineEditReturn'

describe('dashboardInlineEditReturn', () => {
  const deepLinkEntryId = 'entry-from-check'
  const otherEntryId = 'other-entry'
  const checkReturn = captureDashboardInlineEditReturn(deepLinkEntryId, 'logbook-check')

  it('(a) returns to logbook-check when closing the deep-linked entry', () => {
    expect(checkReturn).toEqual({ entryId: deepLinkEntryId, path: '/logbook-check' })
    expect(resolveDashboardInlineEditReturnNavigation(checkReturn, deepLinkEntryId)).toBe(
      '/logbook-check'
    )
  })

  it('(b) does not return after closing a different entry', () => {
    expect(resolveDashboardInlineEditReturnNavigation(checkReturn, otherEntryId)).toBeNull()
  })

  it('(c) stale returnTo without a captured deep link does not navigate', () => {
    expect(captureDashboardInlineEditReturn('', 'logbook-check')).toBeNull()
    expect(resolveDashboardInlineEditReturnNavigation(null, deepLinkEntryId)).toBeNull()
    expect(resolveDashboardInlineEditReturnNavigation(checkReturn, null)).toBeNull()
  })
})