import type { CurrencyStatus, CurrencyStatusType, PassengerCurrencyGroup } from './logbookTypes'
import { formatCurrencyChipDate } from './currencyCalculator'

export type CurrencyDisplayKind = 'passenger' | 'night' | 'instrument' | 'flight_review'

export const CURRENCY_DISPLAY_LABELS: Record<CurrencyDisplayKind, string> = {
  passenger: '90-day passenger',
  night: 'Night passenger',
  instrument: 'IFR experience',
  flight_review: 'Flight review',
}

/** Shown when IFR experience counts approaches in the 6-month window (14 CFR 61.57(c)). */
const IFR_APPROACHES_DISPLAY_TARGET = 6

/** 61.57(a)/(b) takeoff and landing minimums surfaced on {@link CurrencyStatus}. */
const PASSENGER_TAKEOFF_LANDING_DISPLAY_TARGET = 3

export interface CurrencyDisplayItem {
  id: string
  kind: CurrencyDisplayKind
  label: string
  status: CurrencyStatusType
  currentUntil: string | null
  needsLine: string | null
}

function isNearExpiry(status: CurrencyStatusType): boolean {
  return status === 'expiring_soon' || status === 'grace_period'
}

export function formatCurrencyCurrentUntil(
  currency: CurrencyStatus,
  referenceDate: Date = new Date()
): string | null {
  if (currency.status === 'missing') return null
  if (!currency.isCurrent && currency.status === 'expired' && currency.needsIpc) {
    return null
  }
  const until = formatCurrencyChipDate(currency.expirationDate, referenceDate)
  return `Current until ${until}`
}

/** Deficit copy from {@link CurrencyStatus} counts only; rules live in useCurrency / currencyCalculator. */
export function formatCurrencyNeedsLine(
  currency: CurrencyStatus,
  kind: CurrencyDisplayKind
): string | null {
  if (currency.status === 'missing') {
    return kind === 'flight_review' ? 'Add your last flight review' : null
  }

  if (currency.needsIpc) return 'Needs IPC'

  if (currency.isCurrent && !isNearExpiry(currency.status)) {
    return null
  }

  if (kind === 'instrument') {
    if (currency.status === 'grace_period') {
      return 'Grace period, regain with safety pilot or sim'
    }
    const approaches = currency.approaches ?? 0
    if (approaches < IFR_APPROACHES_DISPLAY_TARGET) {
      const deficit = IFR_APPROACHES_DISPLAY_TARGET - approaches
      const noun = deficit === 1 ? 'approach' : 'approaches'
      return `Needs ${deficit} more ${noun}`
    }
    const holding = currency.holdingProcedures ?? 0
    if (holding < 1) return 'Needs holding procedure'
    return null
  }

  if (kind === 'flight_review') {
    if (!currency.isCurrent || isNearExpiry(currency.status)) {
      return 'Flight review due'
    }
    return null
  }

  const needTakeoffs = Math.max(0, PASSENGER_TAKEOFF_LANDING_DISPLAY_TARGET - (currency.takeoffs ?? 0))
  const needLandings = Math.max(0, PASSENGER_TAKEOFF_LANDING_DISPLAY_TARGET - (currency.landings ?? 0))
  if (needTakeoffs === 0 && needLandings === 0) {
    if (!currency.isCurrent) return 'Currency lapsed'
    return null
  }

  const parts: string[] = []
  if (needTakeoffs > 0) {
    parts.push(`${needTakeoffs} more ${needTakeoffs === 1 ? 'takeoff' : 'takeoffs'}`)
  }
  if (needLandings > 0) {
    parts.push(`${needLandings} more ${needLandings === 1 ? 'landing' : 'landings'}`)
  }
  return `Needs ${parts.join(' and ')}`
}

function itemFromStatus(
  id: string,
  kind: CurrencyDisplayKind,
  label: string,
  currency: CurrencyStatus,
  referenceDate: Date
): CurrencyDisplayItem {
  const currentUntil =
    currency.isCurrent || isNearExpiry(currency.status)
      ? formatCurrencyCurrentUntil(currency, referenceDate)
      : null
  const needsLine = formatCurrencyNeedsLine(currency, kind)
  return {
    id,
    kind,
    label,
    status: currency.status,
    currentUntil,
    needsLine,
  }
}

export function buildCurrencyDisplayItems(input: {
  passengerCurrency: CurrencyStatus | null
  nightCurrency: CurrencyStatus | null
  instrumentCurrency: CurrencyStatus | null
  flightReviewCurrency: CurrencyStatus | null
  passengerCurrencyGroups?: PassengerCurrencyGroup[]
  referenceDate?: Date
}): CurrencyDisplayItem[] {
  const ref = input.referenceDate ?? new Date()
  const items: CurrencyDisplayItem[] = []

  const push = (kind: CurrencyDisplayKind, currency: CurrencyStatus | null | undefined) => {
    if (!currency) return
    items.push(
      itemFromStatus(kind, kind, CURRENCY_DISPLAY_LABELS[kind], currency, ref)
    )
  }

  push('passenger', input.passengerCurrency)
  push('night', input.nightCurrency)
  push('instrument', input.instrumentCurrency)
  push('flight_review', input.flightReviewCurrency)

  return items
}