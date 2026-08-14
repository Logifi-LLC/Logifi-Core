export type AirlineOwnSeat = 'PIC' | 'SIC'
export type OwnRoleUnmatchedReason = 'not_on_crew' | 'no_crew' | 'unknown_role'

export interface ListedCrewMember {
  position: string
  name: string
}

/**
 * Map airline / FC View seat strings to PIC or SIC.
 * Empty and unrecognized values return null — callers must not guess PIC.
 */
export function parseAirlineOwnSeat(raw: unknown): AirlineOwnSeat | null {
  if (typeof raw !== 'string') return null
  const v = raw.trim().toLowerCase()
  if (!v) return null
  if (
    v === 'fo' ||
    v === 'sic' ||
    v.includes('first officer') ||
    v.includes('first_officer') ||
    v.includes('second in command')
  ) {
    return 'SIC'
  }
  if (
    v === 'ca' ||
    v === 'capt' ||
    v === 'pic' ||
    v.includes('captain') ||
    v.includes('pilot in command')
  ) {
    return 'PIC'
  }
  return null
}

export function isRecognizedAirlineSeat(raw: unknown): raw is AirlineOwnSeat {
  return parseAirlineOwnSeat(raw) != null
}

export function oppositeCrewJobLabel(ownRole: AirlineOwnSeat): 'Captain' | 'First Officer' {
  return ownRole === 'PIC' ? 'First Officer' : 'Captain'
}

export function applySeatToFlightTime(
  flightTime: Record<string, unknown>,
  role: AirlineOwnSeat
): Record<string, unknown> {
  const ft: Record<string, unknown> = { ...flightTime }
  const total = typeof ft.total === 'number' && Number.isFinite(ft.total) ? ft.total : null
  delete ft.pic
  delete ft.sic
  if (total != null) {
    if (role === 'SIC') ft.sic = total
    else ft.pic = total
  }
  return ft
}

export function isOwnRoleUnmatchedMetadata(meta: unknown): boolean {
  if (!meta || typeof meta !== 'object') return false
  return (meta as { own_role_unmatched?: unknown }).own_role_unmatched === true
}

export function pickOppositeCrew(
  crew: ListedCrewMember[],
  ownRole: AirlineOwnSeat
): { name: string; label: 'Captain' | 'First Officer' } | null {
  const members = crew.filter((m) => m.name.trim().length > 0)
  if (!members.length) return null
  const oppositeSeat: AirlineOwnSeat = ownRole === 'PIC' ? 'SIC' : 'PIC'
  const opposite = members.find((m) => parseAirlineOwnSeat(m.position) === oppositeSeat)
  const pick = opposite ?? members[0]
  return { name: pick.name, label: oppositeCrewJobLabel(ownRole) }
}

export function formatListedCrewHint(
  crew: ListedCrewMember[],
  reason: OwnRoleUnmatchedReason | string | null | undefined
): string {
  if (reason === 'no_crew' || crew.length === 0) {
    return 'No crew was listed on this pairing.'
  }
  if (reason === 'unknown_role') {
    return 'The schedule did not include a recognized seat for you.'
  }
  const listed = crew
    .filter((m) => m.name.trim())
    .map((m) => {
      const pos = m.position.trim().toUpperCase()
      return pos ? `${pos} ${m.name.trim()}` : m.name.trim()
    })
    .join(' · ')
  if (!listed) return 'You were not found on the crew list.'
  return `Crew listed: ${listed} — you were not found.`
}
