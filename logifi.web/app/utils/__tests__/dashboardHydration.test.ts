import { describe, expect, it } from 'vitest'
import { isDashboardPath } from '../appReady'
import { getDisplayedPilotInitials, shouldShowCurrencyChips } from '../dashboardHydration'

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

  it('uses PP only after load when the name is still empty', () => {
    expect(getDisplayedPilotInitials('', true)).toBe('PP')
  })
})

describe('isDashboardPath', () => {
  it('matches /dashboard and nested dashboard routes', () => {
    expect(isDashboardPath('/dashboard')).toBe(true)
    expect(isDashboardPath('/dashboard/')).toBe(true)
    expect(isDashboardPath('/')).toBe(false)
  })
})
