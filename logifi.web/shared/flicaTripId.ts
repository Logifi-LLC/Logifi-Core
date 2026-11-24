/**
 * Pairing-id shapes for CAE FLICA refrigerator pages.
 *
 * Republic's id is a single allowed letter plus digits. That letter is the
 * pairing's id prefix, not a pilot-base lookup. There is no letter-to-base map.
 * Other carriers share one broader pattern. The parser does not branch on
 * airline code; the portal passes one of these sources in.
 */

/** Republic: base letter + 4 digits + optional suffix, or letter + digit + letter + 2 digits. */
export const REPUBLIC_TRIP_ID_PATTERN = '[BCWRILOZPD](?:\\d{4}[A-Z]?|\\d[A-Z]\\d{2})'

/**
 * Same refrigerator header, other id shapes: letters then 3-6 digits, the
 * Republic mixed form, or a 4-6 digit pairing number. Short reserve codes
 * (R11, OFF, GDO) do not match.
 */
export const GENERIC_FLICA_TRIP_ID_PATTERN =
  '(?:[A-Z]{1,3}\\d{3,6}[A-Z]{0,2}|[A-Z]\\d[A-Z]\\d{2}|\\d{4,6}[A-Z]?)'

/** Kept name: existing callers mean the Republic pattern. */
export const FLICA_TRIP_ID_PATTERN = REPUBLIC_TRIP_ID_PATTERN
