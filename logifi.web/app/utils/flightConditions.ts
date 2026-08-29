import type { LogEntry } from './logbookTypes'

const CONDITION_OPTIONS = [
  { value: 'nightVfr', label: 'Night' },
  { value: 'ifr', label: 'IFR' },
  { value: 'simInstrument', label: 'Simulated Instrument' },
  { value: 'actualInstrument', label: 'Actual Instrument' },
  { value: 'crossCountry', label: 'Cross-Country' },
  { value: 'nvg', label: 'NVG' },
] as const

const CONDITION_ALIASES: Record<string, string> = {
  night: 'nightVfr',
  'night vfr': 'nightVfr',
  'night-vfr': 'nightVfr',
  'cross country': 'crossCountry',
  'cross-country': 'crossCountry',
  xc: 'crossCountry',
  hood: 'simInstrument',
  'simulated instrument': 'simInstrument',
  'actual instrument': 'actualInstrument',
}

function canonicalizeFlightCondition(condition: string): string | null {
  const trimmed = condition.trim()
  if (!trimmed || trimmed === 'dayVfr') return null

  const lower = trimmed.toLowerCase()
  const byValue = CONDITION_OPTIONS.find((opt) => opt.value.toLowerCase() === lower)
  if (byValue) return byValue.value

  const byLabel = CONDITION_OPTIONS.find((opt) => opt.label.toLowerCase() === lower)
  if (byLabel) return byLabel.value

  return CONDITION_ALIASES[lower] ?? trimmed
}

function normalizeNumber(value: number | null | string | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

/** Map display labels (IFR, Night) and aliases onto canonical checkbox values. */
export function sanitizeFlightConditions(conditions: string[]): string[] {
  const canonical = (conditions || [])
    .map((condition) => canonicalizeFlightCondition(condition))
    .filter((condition): condition is string => Boolean(condition))
  return [...new Set(canonical)]
}

function autoCheckFlightConditions(
  conditions: string[],
  nightTime: number | null,
  actualInstrumentTime: number | null,
  simulatedInstrumentTime: number | null,
  xcTime: number | null,
  nvgTime: number | null = null,
): string[] {
  const conditionSet = new Set(conditions)

  if (nightTime && nightTime > 0) {
    conditionSet.add('nightVfr')
  }

  if (nvgTime && nvgTime > 0) {
    conditionSet.add('nvg')
  }

  if (actualInstrumentTime && actualInstrumentTime > 0) {
    conditionSet.add('ifr')
    conditionSet.add('actualInstrument')
  } else {
    conditionSet.delete('actualInstrument')
  }

  if (simulatedInstrumentTime && simulatedInstrumentTime > 0) {
    conditionSet.add('simInstrument')
  } else {
    conditionSet.delete('simInstrument')
  }

  if (xcTime && xcTime > 0) {
    conditionSet.add('crossCountry')
  } else {
    conditionSet.delete('crossCountry')
  }

  return Array.from(conditionSet)
}

function sortConditionsInFixedOrder(conditions: string[]): string[] {
  const conditionOrderMap = new Map<string, number>(
    CONDITION_OPTIONS.map((opt, index) => [opt.value, index]),
  )

  return [...conditions]
    .filter((cond): cond is string => typeof cond === 'string' && cond !== '' && cond !== 'dayVfr')
    .sort((a, b) => {
      const orderA = conditionOrderMap.get(a) ?? Infinity
      const orderB = conditionOrderMap.get(b) ?? Infinity
      return orderA - orderB
    })
    .map((cond) => {
      const option = CONDITION_OPTIONS.find((opt) => opt.value === cond)
      return option ? option.label : cond
    })
    .filter((label): label is string => Boolean(label))
    .filter((label, index, array) => array.indexOf(label) === index)
}

export function getDisplayConditions(entry: LogEntry): string[] {
  const merged = autoCheckFlightConditions(
    sanitizeFlightConditions(entry.flightConditions || []),
    normalizeNumber(entry.flightTime?.night),
    normalizeNumber(entry.flightTime?.actualInstrument),
    normalizeNumber(entry.flightTime?.simulatedInstrument),
    normalizeNumber(entry.flightTime?.crossCountry),
    normalizeNumber(entry.flightTime?.nvg),
  )
  return sortConditionsInFixedOrder(merged)
}
