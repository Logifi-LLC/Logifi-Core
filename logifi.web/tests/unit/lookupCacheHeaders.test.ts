import { describe, expect, it } from 'vitest'
import {
  aircraftLookupCacheControl,
  airportLookupCacheControl,
  shouldSetLookupCacheHeader,
} from '../../server/utils/lookupCacheHeaders'

describe('lookupCacheHeaders', () => {
  it('uses a day-long public cache for airport lookups', () => {
    expect(airportLookupCacheControl()).toBe(
      'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'
    )
  })

  it('uses private no-store when aircraft refreshOwner is set', () => {
    expect(aircraftLookupCacheControl(true)).toBe('private, no-store')
  })

  it('uses an hour-long public cache for aircraft lookups', () => {
    expect(aircraftLookupCacheControl(false)).toBe(
      'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
    )
  })

  it('sets the header on success and not-found, not on other failures', () => {
    expect(shouldSetLookupCacheHeader({ success: true })).toBe(true)
    expect(
      shouldSetLookupCacheHeader({ success: false, error: 'Airport not found' })
    ).toBe(true)
    expect(
      shouldSetLookupCacheHeader({
        success: false,
        error: 'Aircraft not found in database or FAA registry',
      })
    ).toBe(true)
    expect(
      shouldSetLookupCacheHeader({
        success: false,
        error: 'Failed to lookup airport information',
      })
    ).toBe(false)
  })
})
