import type { CurrencyStatus, CurrencyStatusType } from './logbookTypes'
import {
  formatCurrencyChip,
  type CurrencyChipKind,
} from './currencyCalculator'

export type CurrencyDisplayKind = 'passenger' | 'night' | 'instrument' | 'flight_review'

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

function isNearExpiry(status: CurrencyStatusType): boolean {
  return status === 'expiring_soon' || status === 'grace_period'
}

function formatTakeoffLandingChipShort(
  prefix: string,
  currency: CurrencyStatus
): string | null {
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
      return `${prefix}: lapsed`
    }
    return null
  }
  const parts: string[] = []
  if (needTakeoffs > 0) parts.push(`${needTakeoffs} T/O`)
  if (needLandings > 0) parts.push(`${needLandings} ldg`)
  return `${prefix}: ${parts.join(' + ')} to go`
}

function formatInstrumentChipShort(currency: CurrencyStatus): string | null {
  if (currency.needsIpc) return null
  if (currency.status === 'grace_period') return null

  const approaches = currency.approaches ?? 0
  if (approaches < IFR_APPROACHES_DISPLAY_TARGET) {
    const deficit = IFR_APPROACHES_DISPLAY_TARGET - approaches
    return `IFR: ${deficit} appr to go`
  }
  const holding = currency.holdingProcedures ?? 0
  if (holding < 1) return 'IFR: holding to go'
  if (!currency.isCurrent || currency.status === 'expired') {
    return 'IFR: lapsed'
  }
  return null
}

/** Compact deficit line for dashboard chips when currency is not current. */
export function formatCurrencyChipShortDeficit(
  kind: CurrencyDisplayKind,
  currency: CurrencyStatus
): string | null {
  if (currency.status === 'missing') return null

  if (kind === 'passenger' || kind === 'night') {
    return formatTakeoffLandingChipShort(CHIP_PREFIX[kind], currency)
  }
  if (kind === 'instrument') {
    return formatInstrumentChipShort(currency)
  }
  if (kind === 'flight_review') {
    if (currency.status === 'missing') return null
    if (!currency.isCurrent || isNearExpiry(currency.status) || currency.status === 'expired') {
      return 'Review due'
    }
  }
  return null
}

/**
 * Dashboard chip label: current/expiring copy from {@link formatCurrencyChip};
 * non-current shows short deficit text from status counts when available.
 */
export function formatCurrencyChipLabel(
  kind: CurrencyChipKind,
  currency: CurrencyStatus | null | undefined,
  referenceDate: Date = new Date()
): string {
  if (!currency) return formatCurrencyChip(kind, currency, referenceDate)

  if (currency.isCurrent && !isNearExpiry(currency.status)) {
    return formatCurrencyChip(kind, currency, referenceDate)
  }

  if (currency.status === 'expiring_soon' || currency.status === 'grace_period') {
    return formatCurrencyChip(kind, currency, referenceDate)
  }

  if (kind === 'flight_review' && currency.status === 'missing') {
    return formatCurrencyChip(kind, currency, referenceDate)
  }

  if (kind === 'instrument' && (currency.needsIpc || currency.status === 'grace_period')) {
    return formatCurrencyChip(kind, currency, referenceDate)
  }

  const deficit = formatCurrencyChipShortDeficit(kind as CurrencyDisplayKind, currency)
  if (deficit) return deficit

  return formatCurrencyChip(kind, currency, referenceDate)
}