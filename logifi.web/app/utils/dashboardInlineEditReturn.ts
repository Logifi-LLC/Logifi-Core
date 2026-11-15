import { parseDashboardReturnTo } from './dashboardReturnTo'

export type DashboardInlineEditReturn = {
  entryId: string
  path: string
}

/** Capture allowlisted return navigation only for a dashboard entry deep link. */
export function captureDashboardInlineEditReturn(
  entryId: string,
  returnToRaw: unknown
): DashboardInlineEditReturn | null {
  if (!entryId) return null
  const path = parseDashboardReturnTo(returnToRaw)
  if (!path) return null
  return { entryId, path }
}

/** Navigate only when the drawer closes the same entry that the deep link opened. */
export function resolveDashboardInlineEditReturnNavigation(
  state: DashboardInlineEditReturn | null | undefined,
  closingEntryId: string | null | undefined
): string | null {
  if (!state || !closingEntryId) return null
  if (state.entryId !== closingEntryId) return null
  return state.path
}