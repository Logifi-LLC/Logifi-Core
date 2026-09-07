/**
 * Initials for avatar badges: first letter of first name + first letter of last name.
 * Returns empty string if name is empty (caller should show logo fallback).
 */
export function getPilotInitialsFromName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) {
    const letter = parts[0]?.[0]?.toUpperCase()
    return letter ? `${letter}${letter}` : ''
  }
  const first = parts[0]?.[0]?.toUpperCase() ?? ''
  const last = parts[parts.length - 1]?.[0]?.toUpperCase() ?? ''
  const initials = `${first}${last}`
  return initials || ''
}
