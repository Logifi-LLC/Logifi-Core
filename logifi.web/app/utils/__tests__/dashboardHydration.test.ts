import { describe, expect, it } from 'vitest'
import { isDashboardPath } from '../appReady'
import {
  canShowLogbookEmptyState,
  getDisplayedPilotInitials,
  isLogbookHydratedForUi,
  shouldShowCurrencyChips,
} from '../dashboardHydration'

describe('shouldShowCurrencyChips', () => {
  it('hides chips while the preference is unset', () => {
    expect(shouldShowCurrencyChips(null)).toBe(false)
  })

  it('shows chips only when the preference is true', () => {
    expect(shouldShowCurrencyChips(true)).toBe(true)
    expect(shouldShowCurrencyChips(false)).toBe(false)
  })
})

describe('getDisplayedPilotInitials', () => {
  it('does not show PP from an empty name before the profile has loaded', () => {
    expect(getDisplayedPilotInitials('', false)).toBe('')
    expect(getDisplayedPilotInitials('Derek Farmer', false)).toBe('')
  })

  it('shows real initials after the profile has loaded', () => {
    expect(getDisplayedPilotInitials('Derek Farmer', true)).toBe('DF')
  })

  it('returns empty string after load when name is empty (for paper airplane avatar fallback)', () => {
    expect(getDisplayedPilotInitials('', true)).toBe('')
  })
})

describe('isDashboardPath', () => {
  it('matches /dashboard and nested dashboard routes', () => {
    expect(isDashboardPath('/dashboard')).toBe(true)
    expect(isDashboardPath('/dashboard/')).toBe(true)
    expect(isDashboardPath('/')).toBe(false)
  })
})

describe('canShowLogbookEmptyState', () => {
  const loading: { localCacheReadComplete: boolean; inboundSyncPending: boolean } = {
    localCacheReadComplete: false,
    inboundSyncPending: false,
  }
  const emptyCacheSyncing = {
    localCacheReadComplete: true,
    inboundSyncPending: true,
  }
  const loaded = {
    localCacheReadComplete: true,
    inboundSyncPending: false,
  }

  it('hides the empty state while the local cache read has not finished', () => {
    expect(canShowLogbookEmptyState(loading, false)).toBe(false)
  })

  it('hides the empty state while empty-cache inbound sync is still pending', () => {
    expect(canShowLogbookEmptyState(emptyCacheSyncing, false)).toBe(false)
  })

  it('shows the empty state once loaded with zero entries for the active logbook', () => {
    expect(canShowLogbookEmptyState(loaded, false)).toBe(true)
  })

  it('does not show the empty state when entries exist', () => {
    expect(canShowLogbookEmptyState(loaded, true)).toBe(false)
  })
})

describe('isLogbookHydratedForUi', () => {
  it('is false until local cache read and inbound sync gate are both settled', () => {
    expect(
      isLogbookHydratedForUi({ localCacheReadComplete: false, inboundSyncPending: false })
    ).toBe(false)
    expect(
      isLogbookHydratedForUi({ localCacheReadComplete: true, inboundSyncPending: true })
    ).toBe(false)
    expect(
      isLogbookHydratedForUi({ localCacheReadComplete: true, inboundSyncPending: false })
    ).toBe(true)
  })
})
