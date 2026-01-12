/**
 * Currency Calculator
 * Calculates Part 61.57 currency requirements for pilots
 */

import { DateTime } from 'luxon'
import type { LogEntry, CurrencyStatus, AnnualCurrencyStatus, CurrencyStatusType } from './logbookTypes'

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
    const hasApproaches = (entry.performance?.approachCount ?? 0) > 0
    
    return hasInstrumentConditions || hasInstrumentTime || hasApproaches
  })
  
  // Count approaches and holding procedures
  let approaches = 0
  let holdingProcedures = 0
  
  qualifyingEntries.forEach(entry => {
    approaches += entry.performance?.approachCount ?? 0
    holdingProcedures += entry.performance?.holdingProcedures ?? 0
  })
  
  // Check for intercept/track tasks in remarks or training elements
  const hasInterceptTrack = qualifyingEntries.some(entry => {
    const remarks = (entry.remarks || '').toLowerCase()
    const training = (entry.trainingElements || '').toLowerCase()
    return remarks.includes('intercept') || remarks.includes('track') ||
           training.includes('intercept') || training.includes('track')
  })
  
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
      const entryApproaches = entry.performance?.approachCount ?? 0
      
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
