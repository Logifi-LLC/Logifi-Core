import navaidIndexJson from '../data/navaid-index.json' with { type: 'json' }

export interface NavaidEntry {
  ident: string
  name: string
  type: string
  latitude: number
  longitude: number
  associatedAirport?: string
  country?: string
}

const navaidIndex = navaidIndexJson as Record<string, NavaidEntry>

export function lookupNavaid(ident: string): NavaidEntry | null {
  const normalized = ident.trim().toUpperCase().replace(/\s+/g, '')
  if (!normalized) return null
  return navaidIndex[normalized] ?? null
}

export function isNavaidIdent(ident: string): boolean {
  return lookupNavaid(ident) !== null
}
