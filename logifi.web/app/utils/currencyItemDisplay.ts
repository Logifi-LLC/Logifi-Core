import type { CurrencyStatus, CurrencyStatusType } from './logbookTypes'
import {
  formatCurrencyChip,
  type CurrencyChipKind,
} from './currencyCalculator'

export type CurrencyDisplayKind = 'passenger' | 'night' | 'instrument' | 'flight_review'

export type CurrencyChipDisplay = {
  label: string
  /** Longer copy for title / aria when the visible chip stays short. */
  title?: string
}

const CHIP_PREFIX: Record<CurrencyDisplayKind, string> = {
  passenger: '90-day',
  night: 'Night',
  instrument: 'IFR',
  flight_review: 'Review',
}

/** Shown when IFR experience counts approaches in the 6-month window (14 CFR 61.57(c)). */
const IFR_APPROACHES_DISPLAY_TARGET = 6

/** 61.57(a)/(b) takeoff and landing minimums surfaced on {@link CurrencyStatus}. */
const PASSENGER_TAKEOFF_LANDING_DISPLAY_TARGET = 3

/** Visible chip text longer than this gets a short label plus title. */
const CHIP_VISIBLE_MAX = 26

function isNearExpiry(status: CurrencyStatusType): boolean {
  return status === 'expiring_soon' || status === 'grace_period'
}

function formatTakeoffLandingChipDisplay(
  prefix: string,
  currency: CurrencyStatus
): CurrencyChipDisplay | null {
  const needTakeoffs = Math.max(
    0,
    PASSENGER_TAKEOFF_LANDING_DISPLAY_TARGET - (currency.takeoffs ?? 0)
  )
  const needLandings = Math.max(
    0,
    PASSENGER_TAKEOFF_LANDING_DISPLAY_TARGET - (currency.landings ?? 0)
  )
  if (needTakeoffs === 0 && needLandings === 0) {
    if (!currency.isCurrent || currency.status === 'expired') {
      return { label: `${prefix}: lapsed`, title: `${prefix} currency lapsed` }
    }
    return null
  }

  const parts: string[] = []
  if (needTakeoffs > 0) parts.push(`${needTakeoffs} T/O`)
  if (needLandings > 0) parts.push(`${needLandings} ldg`)
  const label =
    parts.length === 2
      ? `${prefix}: ${parts[0]} · ${parts[1]}`
      : `${prefix}: ${parts[0]}`

  const detail: string[] = []
  if (needTakeoffs > 0) {
    detail.push(
      `${needTakeoffs} more ${needTakeoffs === 1 ? 'takeoff' : 'takeoffs'}`
    )
  }
  if (needLandings > 0) {
    detail.push(
      `${needLandings} more ${needLandings === 1 ? 'landing' : 'landings'}`
    )
  }
  const title = detail.length ? `Needs ${detail.join(' and ')}` : undefined
  return { label, title }
}

function formatInstrumentChipDisplay(currency: CurrencyStatus): CurrencyChipDisplay | null {
  if (currency.needsIpc) return null
  if (currency.status === 'grace_period') return null

  const approaches = currency.approaches ?? 0
  if (approaches < IFR_APPROACHES_DISPLAY_TARGET) {
    const deficit = IFR_APPROACHES_DISPLAY_TARGET - approaches
    return {
      label: `IFR: ${deficit} appr`,
      title: `Needs ${deficit} more ${deficit === 1 ? 'approach' : 'approaches'}`,
    }
  }
  const holding = currency.holdingProcedures ?? 0
  if (holding < 1) {
    return { label: 'IFR: hold', title: 'Needs holding procedure' }
  }
  if (!currency.isCurrent || currency.status === 'expired') {
    return { label: 'IFR: lapsed', title: 'IFR experience lapsed' }
  }
  return null
}

function formatChipShortDeficit(
  kind: CurrencyDisplayKind,
  currency: CurrencyStatus
): CurrencyChipDisplay | null {
  if (currency.status === 'missing') return null

  if (kind === 'passenger' || kind === 'night') {
    return formatTakeoffLandingChipDisplay(CHIP_PREFIX[kind], currency)
  }
  if (kind === 'instrument') {
    return formatInstrumentChipDisplay(currency)
  }
  if (kind === 'flight_review') {
    if (currency.status === 'missing') return null
    if (!currency.isCurrent || isNearExpiry(currency.status) || currency.status === 'expired') {
      return { label: 'Review due', title: 'Flight review due' }
    }
  }
  return null
}

function shortenFullChipLabel(
  kind: CurrencyChipKind,
  full: string,
  currency: CurrencyStatus
): CurrencyChipDisplay {
  if (kind === 'instrument' && (currency.needsIpc || full.includes('IPC'))) {
    return { label: 'IFR: IPC', title: full }
  }
  if (kind === 'flight_review' && full.startsWith('Add your')) {
    return { label: 'Review: add', title: full }
  }
  if (kind === 'instrument' && full.startsWith('IFR grace')) {
    return { label: 'IFR: grace', title: full }
  }
  return { label: full }
}

/**
 * Dashboard chip: short visible label; detail in {@link CurrencyChipDisplay.title} when needed.
 */
export function formatCurrencyChipForChips(
  kind: CurrencyChipKind,
  currency: CurrencyStatus | null | undefined,
  referenceDate: Date = new Date()
): CurrencyChipDisplay {
  if (!currency) {
    return { label: formatCurrencyChip(kind, currency, referenceDate) }
  }

  if (currency.isCurrent && !isNearExpiry(currency.status)) {
    const full = formatCurrencyChip(kind, currency, referenceDate)
    if (full.length <= CHIP_VISIBLE_MAX) return { label: full }
    return shortenFullChipLabel(kind, full, currency)
  }

  if (currency.status === 'expiring_soon' || currency.status === 'grace_period') {
    const full = formatCurrencyChip(kind, currency, referenceDate)
    if (full.length <= CHIP_VISIBLE_MAX) return { label: full }
    return shortenFullChipLabel(kind, full, currency)
  }

  if (kind === 'flight_review' && currency.status === 'missing') {
    return { label: 'Review: add', title: 'Add your last flight review' }
  }

  if (kind === 'instrument' && currency.needsIpc) {
    const full = formatCurrencyChip(kind, currency, referenceDate)
    return shortenFullChipLabel(kind, full, currency)
  }

  if (kind === 'instrument' && currency.status === 'grace_period') {
    const full = formatCurrencyChip(kind, currency, referenceDate)
    if (full.length <= CHIP_VISIBLE_MAX) return { label: full }
    return shortenFullChipLabel(kind, full, currency)
  }

  const deficit = formatChipShortDeficit(kind as CurrencyDisplayKind, currency)
  if (deficit) return deficit

  const fallback = formatCurrencyChip(kind, currency, referenceDate)
  if (fallback.length <= CHIP_VISIBLE_MAX) return { label: fallback }
  return shortenFullChipLabel(kind, fallback, currency)
}

/** @deprecated Use {@link formatCurrencyChipForChips} for dashboard chips. */
export function formatCurrencyChipShortDeficit(
  kind: CurrencyDisplayKind,
  currency: CurrencyStatus
): string | null {
  return formatChipShortDeficit(kind, currency)?.label ?? null
}

/** @deprecated Use {@link formatCurrencyChipForChips} for dashboard chips. */
export function formatCurrencyChipLabel(
  kind: CurrencyChipKind,
  currency: CurrencyStatus | null | undefined,
  referenceDate: Date = new Date()
): string {
  return formatCurrencyChipForChips(kind, currency, referenceDate).label
}