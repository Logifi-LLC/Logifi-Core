/**
 * Currency Calculator
 * Calculates Part 61.57 currency requirements for pilots
 */

import { DateTime } from 'luxon'
import type { LogEntry, CurrencyStatus, AnnualCurrencyStatus, CurrencyStatusType } from './logbookTypes'
import { getTotalApproachCount } from './logbookTypes'

/**
 * Calculate 90-day passenger currency (Part 61.57(a))
 * Requires 3 takeoffs and 3 landings within 90 days to act as PIC and carry passengers
 */
export function calculatePassengerCurrency(
  entries: LogEntry[],
  referenceDate?: Date
): CurrencyStatus {
  const refDate = referenceDate ? DateTime.fromJSDate(referenceDate) : DateTime.now()
  const ninetyDaysAgo = refDate.minus({ days: 90 })
  
  // Filter entries within the 90-day window
  const qualifyingEntries = entries.filter(entry => {
    const entryDate = DateTime.fromISO(entry.date)
    if (!entryDate.isValid) return false
    return entryDate >= ninetyDaysAgo && entryDate <= refDate
  })
  
  // Count takeoffs and landings
  // Landings count as takeoffs too (you can't land without taking off)
  let takeoffs = 0
  let landings = 0
  
  qualifyingEntries.forEach(entry => {
    const dayTakeoffs = entry.performance?.dayTakeoffs ?? 0
    const dayLandings = entry.performance?.dayLandings ?? 0
    takeoffs += dayTakeoffs + dayLandings // Landings count as takeoffs
    landings += dayLandings
  })
  
  const isCurrent = takeoffs >= 3 && landings >= 3
  
  // Find the oldest entry that contributes to meeting the requirement
  let expirationDate = ninetyDaysAgo.plus({ days: 90 })
  if (isCurrent && qualifyingEntries.length > 0) {
    // Sort entries by date (newest first)
    const sortedEntries = [...qualifyingEntries].sort((a, b) => {
      const dateA = DateTime.fromISO(a.date)
      const dateB = DateTime.fromISO(b.date)
      return dateB.toMillis() - dateA.toMillis() // Descending (newest first)
    })
    
    // Find entries that contribute to meeting the 3 takeoffs and 3 landings requirement
    let accumulatedTakeoffs = 0
    let accumulatedLandings = 0
    let oldestContributingEntry: LogEntry | null = null
    
    for (const entry of sortedEntries) {
      const entryTakeoffs = (entry.performance?.dayTakeoffs ?? 0) + (entry.performance?.dayLandings ?? 0)
      const entryLandings = entry.performance?.dayLandings ?? 0
      
      if (entryTakeoffs > 0 || entryLandings > 0) {
        const wouldHaveTakeoffs = accumulatedTakeoffs + entryTakeoffs
        const wouldHaveLandings = accumulatedLandings + entryLandings
        
        // This entry contributes to meeting the requirement
        oldestContributingEntry = entry
        accumulatedTakeoffs = wouldHaveTakeoffs
        accumulatedLandings = wouldHaveLandings
        
        // Once we've met both requirements, we have the set we need
        if (accumulatedTakeoffs >= 3 && accumulatedLandings >= 3) {
          break
        }
      }
    }
    
    if (oldestContributingEntry) {
      const oldestDate = DateTime.fromISO(oldestContributingEntry.date)
      if (oldestDate.isValid) {
        expirationDate = oldestDate.plus({ days: 90 })
      }
    }
  }
  
  const daysRemaining = Math.ceil(expirationDate.diff(refDate, 'days').days)
  
  let status: CurrencyStatusType = 'expired'
  if (isCurrent) {
    status = daysRemaining < 30 ? 'expiring_soon' : 'current'
  }
  
  return {
    isCurrent,
    daysRemaining: isCurrent ? daysRemaining : 0,
    expirationDate: expirationDate.toJSDate(),
    status,
    qualifyingEntries,
    takeoffs,
    landings
  }
}

/**
 * Calculate 90-day night passenger currency (Part 61.57(b))
 * Requires 3 night takeoffs and 3 night landings to full stop within 90 days to carry passengers at night
 */
export function calculateNightCurrency(
  entries: LogEntry[],
  referenceDate?: Date
): CurrencyStatus {
  const refDate = referenceDate ? DateTime.fromJSDate(referenceDate) : DateTime.now()
  const ninetyDaysAgo = refDate.minus({ days: 90 })
  
  // Filter entries within the 90-day window that have night operations
  const qualifyingEntries = entries.filter(entry => {
    const entryDate = DateTime.fromISO(entry.date)
    if (!entryDate.isValid) return false
    if (entryDate < ninetyDaysAgo || entryDate > refDate) return false
    
    // Must have night conditions or night time logged
    const hasNightConditions = entry.flightConditions?.some(c => 
      c.toLowerCase().includes('night')
    ) ?? false
    const hasNightTime = (entry.flightTime?.night ?? 0) > 0
    const hasNightTakeoffs = (entry.performance?.nightTakeoffs ?? 0) > 0
    const hasNightLandings = (entry.performance?.nightLandings ?? 0) > 0
    
    return hasNightConditions || hasNightTime || hasNightTakeoffs || hasNightLandings
  })
  
  // Count night takeoffs and landings (all night landings must be to full stop per 61.57(b))
  // Landings count as takeoffs too (you can't land without taking off)
  let takeoffs = 0
  let landings = 0
  
  qualifyingEntries.forEach(entry => {
    const nightTakeoffs = entry.performance?.nightTakeoffs ?? 0
    const nightLandings = entry.performance?.nightLandings ?? 0
    takeoffs += nightTakeoffs + nightLandings // Landings count as takeoffs
    landings += nightLandings
  })
  
  const isCurrent = takeoffs >= 3 && landings >= 3
  
  // Find the oldest entry that contributes to meeting the requirement
  let expirationDate = ninetyDaysAgo.plus({ days: 90 })
  if (isCurrent && qualifyingEntries.length > 0) {
    // Sort entries by date (newest first)
    const sortedEntries = [...qualifyingEntries].sort((a, b) => {
      const dateA = DateTime.fromISO(a.date)
      const dateB = DateTime.fromISO(b.date)
      return dateB.toMillis() - dateA.toMillis() // Descending (newest first)
    })
    
    // Find entries that contribute to meeting the 3 night takeoffs and 3 night landings requirement
    let accumulatedTakeoffs = 0
    let accumulatedLandings = 0
    let oldestContributingEntry: LogEntry | null = null
    
    for (const entry of sortedEntries) {
      const entryTakeoffs = (entry.performance?.nightTakeoffs ?? 0) + (entry.performance?.nightLandings ?? 0)
      const entryLandings = entry.performance?.nightLandings ?? 0
      
      if (entryTakeoffs > 0 || entryLandings > 0) {
        const wouldHaveTakeoffs = accumulatedTakeoffs + entryTakeoffs
        const wouldHaveLandings = accumulatedLandings + entryLandings
        
        // This entry contributes to meeting the requirement
        oldestContributingEntry = entry
        accumulatedTakeoffs = wouldHaveTakeoffs
        accumulatedLandings = wouldHaveLandings
        
        // Once we've met both requirements, we have the set we need
        if (accumulatedTakeoffs >= 3 && accumulatedLandings >= 3) {
          break
        }
      }
    }
    
    if (oldestContributingEntry) {
      const oldestDate = DateTime.fromISO(oldestContributingEntry.date)
      if (oldestDate.isValid) {
        expirationDate = oldestDate.plus({ days: 90 })
      }
    }
  }
  
  const daysRemaining = Math.ceil(expirationDate.diff(refDate, 'days').days)
  
  let status: CurrencyStatusType = 'expired'
  if (isCurrent) {
    status = daysRemaining < 30 ? 'expiring_soon' : 'current'
  }
  
  return {
    isCurrent,
    daysRemaining: isCurrent ? daysRemaining : 0,
    expirationDate: expirationDate.toJSDate(),
    status,
    qualifyingEntries,
    takeoffs,
    landings
  }
}

/**
 * Calculate 6-month instrument currency (Part 61.57(c))
 * Requires 6 instrument approaches, holding procedures, and intercept/track tasks within 6 months
 */
export function calculateInstrumentCurrency(
  entries: LogEntry[],
  referenceDate?: Date
): CurrencyStatus {
  const refDate = referenceDate ? DateTime.fromJSDate(referenceDate) : DateTime.now()
  const sixMonthsAgo = refDate.minus({ months: 6 })
  
  // Filter entries within the 6-month window that have instrument operations
  const qualifyingEntries = entries.filter(entry => {
    const entryDate = DateTime.fromISO(entry.date)
    if (!entryDate.isValid) return false
    if (entryDate < sixMonthsAgo || entryDate > refDate) return false
    
    // Must have instrument conditions, instrument time, or approaches
    const hasInstrumentConditions = entry.flightConditions?.some(c => 
      c.toLowerCase().includes('ifr') || c.toLowerCase().includes('instrument')
    ) ?? false
    const hasInstrumentTime = ((entry.flightTime?.actualInstrument ?? 0) + 
                                (entry.flightTime?.simulatedInstrument ?? 0)) > 0
    const hasApproaches = getTotalApproachCount(entry.performance) > 0
    
    return hasInstrumentConditions || hasInstrumentTime || hasApproaches
  })
  
  // Count approaches and holding procedures
  let approaches = 0
  let holdingProcedures = 0
  
  qualifyingEntries.forEach(entry => {
    approaches += getTotalApproachCount(entry.performance)
    holdingProcedures += entry.performance?.holdingProcedures ?? 0
  })
  
  // Intercept/track is satisfied by 6+ approaches (it happens with every approach) or by explicit remarks/training
  const hasInterceptTrackInRemarks = qualifyingEntries.some(entry => {
    const remarks = (entry.remarks || '').toLowerCase()
    const training = (entry.trainingElements || '').toLowerCase()
    return remarks.includes('intercept') || remarks.includes('track') ||
           training.includes('intercept') || training.includes('track')
  })
  const hasInterceptTrack = approaches >= 6 || hasInterceptTrackInRemarks

  // Currency requires: 6 approaches, holding procedures, and intercept/track
  const isCurrent = approaches >= 6 && holdingProcedures > 0 && hasInterceptTrack
  
  // Find the oldest entry that contributes to meeting the requirement
  let expirationDate = sixMonthsAgo.plus({ months: 6 })
  if (isCurrent && qualifyingEntries.length > 0) {
    // Sort entries by date (newest first)
    const sortedEntries = [...qualifyingEntries].sort((a, b) => {
      const dateA = DateTime.fromISO(a.date)
      const dateB = DateTime.fromISO(b.date)
      return dateB.toMillis() - dateA.toMillis() // Descending (newest first)
    })
    
    // Find entries that contribute to meeting the 6 approaches requirement
    // (holding procedures and intercept/track are just existence checks)
    let accumulatedApproaches = 0
    let oldestContributingEntry: LogEntry | null = null
    
    for (const entry of sortedEntries) {
      const entryApproaches = getTotalApproachCount(entry.performance)
      
      if (entryApproaches > 0) {
        // Since we're going from newest to oldest, always update the oldest contributing entry
        oldestContributingEntry = entry
        accumulatedApproaches += entryApproaches
        
        // Once we've met the requirement, we have the set we need
        if (accumulatedApproaches >= 6) {
          break
        }
      }
    }
    
    if (oldestContributingEntry) {
      const oldestDate = DateTime.fromISO(oldestContributingEntry.date)
      if (oldestDate.isValid) {
        expirationDate = oldestDate.plus({ months: 6 })
      }
    }
  }
  
  const monthsRemaining = expirationDate.diff(refDate, 'months').months
  const daysRemaining = Math.ceil(expirationDate.diff(refDate, 'days').days)
  
  let status: CurrencyStatusType = 'expired'
  if (isCurrent) {
    status = monthsRemaining < 2 ? 'expiring_soon' : 'current'
  }
  
  return {
    isCurrent,
    monthsRemaining: isCurrent ? monthsRemaining : 0,
    daysRemaining: isCurrent ? daysRemaining : 0,
    expirationDate: expirationDate.toJSDate(),
    status,
    qualifyingEntries,
    approaches,
    holdingProcedures
  }
}

/**
 * Calculate annual requirements (framework)
 * This is a placeholder for future expansion with certificate/rating-specific requirements
 */
export function calculateAnnualRequirements(
  entries: LogEntry[],
  referenceDate?: Date
): AnnualCurrencyStatus {
  const refDate = referenceDate ? DateTime.fromJSDate(referenceDate) : DateTime.now()
  const oneYearAgo = refDate.minus({ months: 12 })
  
  // Filter entries within the last year
  const qualifyingEntries = entries.filter(entry => {
    const entryDate = DateTime.fromISO(entry.date)
    if (!entryDate.isValid) return false
    return entryDate >= oneYearAgo && entryDate <= refDate
  })
  
  // Framework for future expansion
  // Annual requirements vary by certificate/rating type
  // Examples: Flight review (24 months), medical certificate, etc.
  
  return {
    isCurrent: true, // Default to current until specific requirements are implemented
    status: 'current',
    requirements: [],
    qualifyingEntries
  }
}

export type CurrencyHintKind = 'passenger' | 'night' | 'instrument'

function formatHintDate(date: DateTime, reference: DateTime): string {
  if (date.year === reference.year) return date.toFormat('LLL d')
  return date.toFormat('LLL d, yyyy')
}

function oldestQualifyingDate(status: CurrencyStatus): DateTime | null {
  let oldest: DateTime | null = null
  for (const entry of status.qualifyingEntries) {
    const date = DateTime.fromISO(entry.date)
    if (!date.isValid) continue
    if (!oldest || date < oldest) oldest = date
  }
  return oldest
}

function agingOutDate(
  kind: CurrencyHintKind,
  status: CurrencyStatus,
  reference: DateTime
): DateTime | null {
  if (status.status === 'expiring_soon') {
    const expiration = DateTime.fromJSDate(status.expirationDate)
    return expiration.isValid ? expiration : null
  }

  const oldest = oldestQualifyingDate(status)
  if (!oldest) return null
  const agedOut = kind === 'instrument' ? oldest.plus({ months: 6 }) : oldest.plus({ days: 90 })
  if (agedOut <= reference) return null
  return agedOut
}

function countPhrase(count: number, singular: string, pluralWord: string, useMore: boolean): string {
  const noun = count === 1 ? singular : pluralWord
  return useMore ? `${count} more ${noun}` : `${count} ${noun}`
}

function joinClauses(parts: string[]): string {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
}

function passengerNightNeedParts(
  kind: 'passenger' | 'night',
  takeoffs: number,
  landings: number
): string[] {
  const needTakeoffs = Math.max(0, 3 - takeoffs)
  const needLandings = Math.max(0, 3 - landings)
  const landingNoun = kind === 'night' ? 'night landing' : 'landing'
  const landingPlural = kind === 'night' ? 'night landings' : 'landings'
  const takeoffNoun = kind === 'night' ? 'night takeoff' : 'takeoff'
  const takeoffPlural = kind === 'night' ? 'night takeoffs' : 'takeoffs'
  const parts: string[] = []

  if (needLandings > 0 && needTakeoffs > 0 && needTakeoffs <= needLandings) {
    parts.push(countPhrase(needLandings, landingNoun, landingPlural, landings > 0))
    return parts
  }

  if (needTakeoffs > 0) {
    parts.push(countPhrase(needTakeoffs, takeoffNoun, takeoffPlural, takeoffs > 0))
  }
  if (needLandings > 0) {
    parts.push(countPhrase(needLandings, landingNoun, landingPlural, landings > 0))
  }
  return parts
}

function instrumentNeedParts(status: CurrencyStatus): string[] {
  const approaches = status.approaches ?? 0
  const holding = status.holdingProcedures ?? 0
  const needApproaches = Math.max(0, 6 - approaches)
  const parts: string[] = []
  if (needApproaches > 0) {
    parts.push(countPhrase(needApproaches, 'approach', 'approaches', approaches > 0))
  }
  if (holding <= 0) {
    parts.push('a holding procedure')
  }
  return parts
}

/**
 * One-line advice for expired / expiring-soon currency cards.
 * Returns null when the requirement is fully current.
 */
export function formatCurrencyDeficitHint(
  kind: CurrencyHintKind,
  status: CurrencyStatus,
  referenceDate?: Date
): string | null {
  if (status.status === 'current') return null

  const reference = referenceDate
    ? DateTime.fromJSDate(referenceDate)
    : DateTime.now()

  let parts: string[]
  if (kind === 'instrument') {
    parts = instrumentNeedParts(status)
  } else {
    parts = passengerNightNeedParts(kind, status.takeoffs ?? 0, status.landings ?? 0)
  }

  if (status.status === 'expiring_soon') {
    if (kind === 'passenger') {
      parts = [
        countPhrase(3, 'takeoff', 'takeoffs', true),
        countPhrase(3, 'landing', 'landings', true),
      ]
    } else if (kind === 'night') {
      parts = [countPhrase(3, 'night landing', 'night landings', true)]
    } else {
      parts = [countPhrase(6, 'approach', 'approaches', true)]
    }
    const byDate = agingOutDate(kind, status, reference)
    const clause = joinClauses(parts)
    if (!clause) return null
    if (byDate) return `Do ${clause} by ${formatHintDate(byDate, reference)} to stay current`
    return `Do ${clause} to stay current`
  }

  if (parts.length === 0) return null

  const byDate = agingOutDate(kind, status, reference)
  const clause = joinClauses(parts)
  if (byDate) return `Need ${clause} by ${formatHintDate(byDate, reference)}`
  return `Need ${clause}`
}
