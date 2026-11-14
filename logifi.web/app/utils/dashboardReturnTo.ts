/** Allowlisted `returnTo` query tokens for dashboard deep links (never arbitrary URLs). */
export const DASHBOARD_RETURN_TO_ROUTES = {
  'logbook-check': '/logbook-check',
} as const

export type DashboardReturnToToken = keyof typeof DASHBOARD_RETURN_TO_ROUTES

export function parseDashboardReturnTo(raw: unknown): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') return null
  const token = value.trim()
  if (!token) return null
  if (!(token in DASHBOARD_RETURN_TO_ROUTES)) return null
  return DASHBOARD_RETURN_TO_ROUTES[token as DashboardReturnToToken]
}

export function dashboardReturnToQuery(token: DashboardReturnToToken): { returnTo: DashboardReturnToToken } {
  return { returnTo: token }
}
