import { getPilotInitialsFromName } from './pilotProfile'

/** Currency chips stay hidden until the saved preference has been read. */
export function shouldShowCurrencyChips(pref: boolean | null): boolean {
  return pref === true
}

/** Avoid flashing the empty-name fallback (PP) before local profile is loaded. */
export function getDisplayedPilotInitials(displayName: string, profileLoaded: boolean): string {
  if (!profileLoaded) return ''
  return getPilotInitialsFromName(displayName)
}
