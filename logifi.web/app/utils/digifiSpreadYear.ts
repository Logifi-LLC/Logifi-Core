export function parseDigifiIsoDateParts(iso: string): { y: number; m: number; d: number } | null {
  const parts = iso.split('-').map(Number)
  if (parts.length !== 3 || parts.some((p) => !Number.isFinite(p))) return null
  const [y, m, d] = parts
  return { y, m, d }
}

export function formatDigifiIsoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Year for a spread row when the pilot locked defaultYear before scan.
 * Rolls to defaultYear + 1 only on Dec → Jan; duplicate/out-of-order days stay on defaultYear.
 */
export function resolveDigifiSpreadYear(
  m: number,
  d: number,
  defaultYear: number,
  lastDateIso?: string | null
): number {
  if (!lastDateIso) return defaultYear
  const last = parseDigifiIsoDateParts(lastDateIso)
  if (!last) return defaultYear

  if (last.m === m && last.d === d) {
    if (last.y === defaultYear + 1 && last.m === 1 && last.d === 31) {
      return defaultYear
    }
    if (last.y >= defaultYear && last.y <= defaultYear + 1) return last.y
    return defaultYear
  }

  const atDefaultYear = new Date(defaultYear, m - 1, d).getTime()
  const atLastYear = new Date(last.y, m - 1, d).getTime()
  const lastTime = new Date(last.y, last.m - 1, last.d).getTime()

  if (
    last.y === defaultYear + 1 &&
    last.m === 1 &&
    last.d === 31 &&
    m === 2 &&
    d === 1
  ) {
    return defaultYear
  }

  // Continue January on the rolled year after Dec→Jan, not OCR-inflated years on the prior page.
  if (last.y === defaultYear + 1 && last.m === 1 && atLastYear >= lastTime) {
    return last.y
  }

  if (last.m === 12 && m === 1 && atDefaultYear < lastTime) {
    return defaultYear + 1
  }

  return defaultYear
}
