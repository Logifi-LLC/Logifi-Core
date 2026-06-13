/** Synthetic catalog family for entries with a registration but no make/model. */
export const UNKNOWN_AIRCRAFT_FAMILY = 'Unknown aircraft'

/** Catalog family key: exact stored make/model string (no variant merging). */
export function catalogAircraftFamilyKey(
  makeModel: string,
  registration?: string
): string {
  const trimmed = (makeModel || '').trim()
  if (trimmed && trimmed.toLowerCase() !== 'unknown') return trimmed
  const tail = (registration || '').trim().toUpperCase()
  if (tail) return UNKNOWN_AIRCRAFT_FAMILY
  return ''
}
