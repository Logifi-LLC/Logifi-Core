export interface FlicaPortalConfig {
  airlineCode: string
  host: string
  label: string
  /** Prefixed onto employee numbers when the user enters digits only. */
  userIdPrefix?: string
}

const PORTALS: Record<string, FlicaPortalConfig> = {
  RJET: {
    airlineCode: 'RJET',
    host: 'rpa.flica.net',
    label: 'Republic',
    userIdPrefix: 'RPA',
  },
}

export function listFlicaPortals(): FlicaPortalConfig[] {
  return Object.values(PORTALS)
}

export function resolveFlicaPortal(airlineCode?: string | null): FlicaPortalConfig {
  const code = (airlineCode ?? 'RJET').trim().toUpperCase() || 'RJET'
  const portal = PORTALS[code]
  if (!portal) {
    throw new Error(`Unsupported FLICA airline code: ${code}`)
  }
  return portal
}

/**
 * Normalize FLICA User ID. Accepts full id (RPA624619) or employee number (624619).
 */
export function normalizeFlicaUserId(raw: string, portal: FlicaPortalConfig): string {
  const id = raw.trim()
  if (!id) return ''
  if (/^\d+$/.test(id) && portal.userIdPrefix) {
    return `${portal.userIdPrefix}${id}`
  }
  return id
}
