export function parseDigifiIsoDateParts(iso: string): { y: number; m: number; d: number } | null {
  const parts = iso.split('-').map(Number)
  if (parts.length !== 3 || parts.some((p) => !Number.isFinite(p))) return null
  const [y, m, d] = parts
  return { y, m, d }
}

export function formatDigifiIsoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Year in effect while resolving one page's rows in order. Start each sequence at { year: null }. */
export interface DigifiSpreadYearState {
  year: number | null
}

/**
 * Year for a spread row when the pilot locked defaultYear before scan.
 *
 * The year in effect is `spreadYear` (the locked year until the spread rolls over). The only
 * change is a December row followed by a January row, which rolls forward by exactly one year,
 * never past defaultYear + 1. The rolled year then holds for the following rows. A later year
 * from anywhere else (OCR, or a January row without the December before it) is ignored, and
 * the year never moves backward.
 */
export function resolveDigifiSpreadYear(
  m: number,
  _d: number,
  defaultYear: number,
  lastDateIso?: string | null,
  spreadYear?: number | null
): number {
  const base =
    typeof spreadYear === 'number' && spreadYear >= defaultYear && spreadYear <= defaultYear + 1
      ? spreadYear
      : defaultYear
  const last = lastDateIso ? parseDigifiIsoDateParts(lastDateIso) : null
  if (last && last.m === 12 && m === 1) return Math.min(base + 1, defaultYear + 1)
  return base
}
