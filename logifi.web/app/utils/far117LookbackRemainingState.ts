export type Far117LookbackRemainingState =
  | 'normal'
  | 'near_limit'
  | 'critical'
  | 'over_limit'

const NEAR_LIMIT_FRACTION = 0.2
const CRITICAL_LIMIT_FRACTION = 0.05

/** Remaining-hour band for FAR 117 lookback color (informational only). */
export function far117LookbackRemainingState(
  remainingHours: number,
  limitHours: number,
  usedHours: number,
): Far117LookbackRemainingState {
  if (usedHours > limitHours) return 'over_limit'
  const nearThreshold = limitHours * NEAR_LIMIT_FRACTION
  const criticalThreshold = limitHours * CRITICAL_LIMIT_FRACTION
  if (remainingHours <= criticalThreshold) return 'critical'
  if (remainingHours <= nearThreshold) return 'near_limit'
  return 'normal'
}

export function far117LookbackStateAriaPhrase(
  state: Far117LookbackRemainingState,
): string {
  switch (state) {
    case 'over_limit':
      return 'over limit'
    case 'critical':
      return 'very near limit'
    case 'near_limit':
      return 'near limit'
    default:
      return 'within limit'
  }
}

const STATE_RANK: Record<Far117LookbackRemainingState, number> = {
  normal: 0,
  near_limit: 1,
  critical: 2,
  over_limit: 3,
}

/** Returns the more severe of two (or more) lookback states. */
export function far117LookbackWorstState(
  ...states: Far117LookbackRemainingState[]
): Far117LookbackRemainingState {
  return states.reduce(
    (worst, state) => (STATE_RANK[state] > STATE_RANK[worst] ? state : worst),
    'normal' as Far117LookbackRemainingState,
  )
}

export function shouldShowFar117StatusDot(
  worst: Far117LookbackRemainingState,
): boolean {
  return worst !== 'normal'
}

export function far117LookbackDotBgClass(
  state: Far117LookbackRemainingState,
  isDarkMode: boolean,
): string {
  if (state === 'over_limit' || state === 'critical') {
    return isDarkMode ? 'bg-rose-400' : 'bg-rose-600'
  }
  if (state === 'near_limit') {
    return isDarkMode ? 'bg-amber-400' : 'bg-amber-600'
  }
  return 'bg-gray-500'
}

export function far117LookbackStateTextClass(
  state: Far117LookbackRemainingState,
  isDarkMode: boolean,
): string {
  if (state === 'over_limit' || state === 'critical') {
    return isDarkMode ? 'text-rose-400' : 'text-rose-600'
  }
  if (state === 'near_limit') {
    return isDarkMode ? 'text-amber-400' : 'text-amber-600'
  }
  return 'text-gray-500'
}