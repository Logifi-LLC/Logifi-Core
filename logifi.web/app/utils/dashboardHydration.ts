import { getPilotInitialsFromName } from './pilotProfile'

export type LogbookEmptyStateGate = {
  localCacheReadComplete: boolean
  inboundSyncPending: boolean
}

/** Currency chips stay hidden until the saved preference has been read. */
export function shouldShowCurrencyChips(pref: boolean | null): boolean {
  return pref === true
}

/** Avoid flashing the new-user empty state before IndexedDB (and empty-cache inbound sync) settle. */
export function canShowLogbookEmptyState(
  gate: LogbookEmptyStateGate,
  hasAnyEntriesForActiveLogbook: boolean
): boolean {
  if (!gate.localCacheReadComplete) return false
  if (gate.inboundSyncPending) return false
  return !hasAnyEntriesForActiveLogbook
}

export function isLogbookHydratedForUi(gate: LogbookEmptyStateGate): boolean {
  return gate.localCacheReadComplete && !gate.inboundSyncPending
}

/** Avoid flashing the empty-name fallback (PP) before local profile is loaded. */
export function getDisplayedPilotInitials(displayName: string, profileLoaded: boolean): string {
  if (!profileLoaded) return ''
  return getPilotInitialsFromName(displayName)
}
