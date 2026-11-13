import { describe, it, expect } from 'vitest'
import {
  calculatePassengerCurrency,
  calculateNightCurrency,
  calculateInstrumentCurrency,
  calculateFlightReview,
  calculateAnnualRequirements,
  formatCurrencyChip,
  formatCurrencyChipDate,
} from '../currencyCalculator'
import type { CurrencyStatus, LogEntry } from '../logbookTypes'

describe('currencyCalculator', () => {
  const localYmd = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const createTestEntry = (overrides: Partial<LogEntry>): LogEntry => ({
    id: 'test-id',
    date: '2024-01-01',
    role: 'PIC',
    aircraftCategoryClass: 'Airplane SEL',
    categoryClassTime: null,
    aircraftMakeModel: 'C172',
    registration: 'N12345',
    flightNumber: null,
    departure: 'KJFK',
    destination: 'KLGA',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: [],
    remarks: '',
    flightTime: {
      total: 1.5,
      pic: 1.5,
      sic: null,
      dual: null,
      solo: null,
      night: null,
      actualInstrument: null,
      simulatedInstrument: null,
      crossCountry: null
    },
    performance: {
      dayTakeoffs: 0,
      dayLandings: 0,
      nightTakeoffs: null,
      nightLandings: null,
      approachCount: null,
      holdingProcedures: null
    },
    ...overrides
  })

  describe('calculatePassengerCurrency', () => {
    it('should return expired status when no entries provided', () => {
      const result = calculatePassengerCurrency([])
      
      expect(result.isCurrent).toBe(false)
      expect(result.status).toBe('expired')
      expect(result.takeoffs).toBe(0)
      expect(result.landings).toBe(0)
    })

    it('should return current status when requirement is met', () => {
      const entries: LogEntry[] = []
      const today = new Date(2024, 2, 15)
      
      // Create 3 entries with takeoffs and landings within 90 days
      for (let i = 0; i < 3; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() - (i * 10)) // 0, 10, 20 days ago
        entries.push(createTestEntry({
          date: localYmd(date),
          performance: {
            dayTakeoffs: 1,
            dayLandings: 1,
            nightTakeoffs: null,
            nightLandings: null,
            approachCount: null,
            holdingProcedures: null
          }
        }))
      }
      
      const result = calculatePassengerCurrency(entries, today)
      
      expect(result.isCurrent).toBe(true)
      expect(result.status).toBe('current')
      expect(result.takeoffs).toBeGreaterThanOrEqual(3)
      expect(result.landings).toBeGreaterThanOrEqual(3)
    })

    it('should return expired status when entries are older than 90 days', () => {
      const entries: LogEntry[] = []
      const today = new Date(2024, 2, 15)
      
      // Create entries 100 days ago
      const oldDate = new Date(today)
      oldDate.setDate(oldDate.getDate() - 100)
      
      entries.push(createTestEntry({
        date: localYmd(oldDate),
        performance: {
          dayTakeoffs: 10,
          dayLandings: 10,
          nightTakeoffs: null,
          nightLandings: null,
          approachCount: null,
          holdingProcedures: null
        }
      }))
      
      const result = calculatePassengerCurrency(entries, today)
      
      expect(result.isCurrent).toBe(false)
      expect(result.status).toBe('expired')
    })

    it('should calculate expiration date correctly', () => {
      const entries: LogEntry[] = []
      const today = new Date(2024, 2, 15)
      const entryDate = new Date(today)
      entryDate.setDate(entryDate.getDate() - 30) // 30 days ago
      
      entries.push(createTestEntry({
        date: localYmd(entryDate),
        performance: {
          dayTakeoffs: 3,
          dayLandings: 3,
          nightTakeoffs: null,
          nightLandings: null,
          approachCount: null,
          holdingProcedures: null
        }
      }))
      
      const result = calculatePassengerCurrency(entries, today)
      
      expect(result.isCurrent).toBe(true)
      // Expiration should be 90 days from the entry date
      const expectedExpiration = new Date(entryDate)
      expectedExpiration.setDate(expectedExpiration.getDate() + 90)
      
      expect(result.expirationDate.toDateString()).toBe(expectedExpiration.toDateString())
    })

    it('should return expiring_soon status when less than 30 days remaining', () => {
      const entries: LogEntry[] = []
      const today = new Date(2024, 2, 15)
      const entryDate = new Date(today)
      entryDate.setDate(entryDate.getDate() - 65) // 65 days ago (25 days remaining)
      
      entries.push(createTestEntry({
        date: localYmd(entryDate),
        performance: {
          dayTakeoffs: 3,
          dayLandings: 3,
          nightTakeoffs: null,
          nightLandings: null,
          approachCount: null,
          holdingProcedures: null
        }
      }))
      
      const result = calculatePassengerCurrency(entries, today)
      
      expect(result.isCurrent).toBe(true)
      expect(result.status).toBe('expiring_soon')
    })

    // 14 CFR 61.57(a): night full-stop landings count toward the 3 takeoffs/landings.
    it('counts night landings toward 61.57(a) passenger currency', () => {
      const today = new Date(2024, 2, 15)
      const entries = [
        createTestEntry({
          date: '2024-03-01',
          performance: {
            dayTakeoffs: 0,
            dayLandings: 0,
            nightTakeoffs: 3,
            nightLandings: 3,
            approachCount: null,
            holdingProcedures: null,
          },
        }),
      ]
      const result = calculatePassengerCurrency(entries, today)
      expect(result.isCurrent).toBe(true)
      expect(result.landings).toBe(3)
      expect(result.takeoffs).toBeGreaterThanOrEqual(3)
    })

    it('includes a landing on the 90th preceding day and excludes the 91st (leap-year window)', () => {
      // 2024-03-01 minus 90 days = 2023-12-02 (Feb 2024 has 29 days).
      const today = new Date(2024, 2, 1)
      const onBoundary = createTestEntry({
        date: '2023-12-02',
        performance: {
          dayTakeoffs: 3,
          dayLandings: 3,
          nightTakeoffs: null,
          nightLandings: null,
          approachCount: null,
          holdingProcedures: null,
        },
      })
      const tooOld = createTestEntry({
        date: '2023-12-01',
        performance: {
          dayTakeoffs: 10,
          dayLandings: 10,
          nightTakeoffs: null,
          nightLandings: null,
          approachCount: null,
          holdingProcedures: null,
        },
      })
      expect(calculatePassengerCurrency([onBoundary], today).isCurrent).toBe(true)
      expect(calculatePassengerCurrency([tooOld], today).isCurrent).toBe(false)
    })
  })

  describe('calculateNightCurrency', () => {
    it('should return expired status when no night entries provided', () => {
      const result = calculateNightCurrency([])
      
      expect(result.isCurrent).toBe(false)
      expect(result.status).toBe('expired')
    })

    it('should return current status when night requirement is met', () => {
      const entries: LogEntry[] = []
      const today = new Date(2024, 2, 15)
      
      // Create 3 entries with night takeoffs and landings
      for (let i = 0; i < 3; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() - (i * 10))
        entries.push(createTestEntry({
          date: localYmd(date),
          flightConditions: ['nightVfr'],
          performance: {
            dayTakeoffs: 0,
            dayLandings: 0,
            nightTakeoffs: 1,
            nightLandings: 1,
            approachCount: null,
            holdingProcedures: null
          }
        }))
      }
      
      const result = calculateNightCurrency(entries, today)
      
      expect(result.isCurrent).toBe(true)
      expect(result.status).toBe('current')
      expect(result.takeoffs).toBeGreaterThanOrEqual(3)
      expect(result.landings).toBeGreaterThanOrEqual(3)
    })

    it('should identify night entries by flight conditions', () => {
      const entries: LogEntry[] = []
      const today = new Date(2024, 2, 15)
      const entryDate = new Date(today)
      entryDate.setDate(entryDate.getDate() - 10)
      
      entries.push(createTestEntry({
        date: localYmd(entryDate),
        flightConditions: ['nightVfr'],
        performance: {
          dayTakeoffs: 0,
          dayLandings: 0,
          nightTakeoffs: 3,
          nightLandings: 3,
          approachCount: null,
          holdingProcedures: null
        }
      }))
      
      const result = calculateNightCurrency(entries, today)
      
      expect(result.isCurrent).toBe(true)
      expect(result.qualifyingEntries.length).toBe(1)
    })

    // 14 CFR 61.57(b): day landings do not satisfy night passenger-carrying currency.
    it('does not count day landings toward night currency', () => {
      const today = new Date(2024, 2, 15)
      const entries = [
        createTestEntry({
          date: '2024-03-01',
          performance: {
            dayTakeoffs: 5,
            dayLandings: 5,
            nightTakeoffs: 0,
            nightLandings: 0,
            approachCount: null,
            holdingProcedures: null,
          },
        }),
      ]
      const result = calculateNightCurrency(entries, today)
      expect(result.isCurrent).toBe(false)
      expect(result.landings).toBe(0)
    })

    it('treats three logged night landings as full-stop 61.57(b) landings', () => {
      const today = new Date(2024, 2, 15)
      const entries = [
        createTestEntry({
          date: '2024-03-01',
          flightTime: {
            total: 1.0,
            pic: 1.0,
            sic: null,
            dual: null,
            solo: null,
            night: 1.0,
            actualInstrument: null,
            simulatedInstrument: null,
            crossCountry: null,
          },
          performance: {
            dayTakeoffs: 0,
            dayLandings: 0,
            nightTakeoffs: 0,
            nightLandings: 3,
            approachCount: null,
            holdingProcedures: null,
          },
        }),
      ]
      const result = calculateNightCurrency(entries, today)
      expect(result.isCurrent).toBe(true)
      expect(result.landings).toBe(3)
    })

    it('uses a 90-day window that includes Feb 29 of a leap year', () => {
      const today = new Date(2024, 4, 29) // 2024-05-29
      const leapNight = createTestEntry({
        date: '2024-02-29',
        performance: {
          dayTakeoffs: 0,
          dayLandings: 0,
          nightTakeoffs: 3,
          nightLandings: 3,
          approachCount: null,
          holdingProcedures: null,
        },
      })
      expect(calculateNightCurrency([leapNight], today).isCurrent).toBe(true)
      const afterWindow = new Date(2024, 4, 30) // 90 days after Feb 29 is May 29
      expect(calculateNightCurrency([leapNight], afterWindow).isCurrent).toBe(false)
    })
  })

  describe('calculateInstrumentCurrency', () => {
    it('should return expired status when no instrument entries provided', () => {
      const result = calculateInstrumentCurrency([])
      
      expect(result.isCurrent).toBe(false)
      expect(result.status).toBe('expired')
    })

    it('should return current status when instrument requirement is met', () => {
      const entries: LogEntry[] = []
      const today = new Date(2024, 2, 15)
      const entryDate = new Date(today)
      entryDate.setMonth(entryDate.getMonth() - 2) // 2 months ago
      
      entries.push(createTestEntry({
        date: localYmd(entryDate),
        flightConditions: ['IFR'],
        flightTime: {
          total: 2.0,
          pic: 2.0,
          sic: null,
          dual: null,
          solo: null,
          night: null,
          actualInstrument: 2.0,
          simulatedInstrument: null,
          crossCountry: null
        },
        performance: {
          dayTakeoffs: 0,
          dayLandings: 0,
          nightTakeoffs: null,
          nightLandings: null,
          approachCount: 6,
          holdingProcedures: 1
        },
        remarks: 'Intercept and track procedures'
      }))
      
      const result = calculateInstrumentCurrency(entries, today)
      
      expect(result.isCurrent).toBe(true)
      expect(result.approaches).toBeGreaterThanOrEqual(6)
      expect(result.holdingProcedures).toBeGreaterThan(0)
    })

    it('should be current with 6+ approaches and holding even without intercept/track in remarks', () => {
      const entries: LogEntry[] = []
      const today = new Date(2024, 2, 15)
      const entryDate = new Date(today)
      entryDate.setMonth(entryDate.getMonth() - 2)
      
      entries.push(createTestEntry({
        date: localYmd(entryDate),
        flightConditions: ['IFR'],
        performance: {
          dayTakeoffs: 0,
          dayLandings: 0,
          nightTakeoffs: null,
          nightLandings: null,
          approachCount: 10,
          holdingProcedures: 5
        },
        remarks: '' // No intercept/track in remarks; 6+ approaches satisfy it organically
      }))
      
      const result = calculateInstrumentCurrency(entries, today)
      
      expect(result.isCurrent).toBe(true)
      expect(result.approaches).toBeGreaterThanOrEqual(6)
      expect(result.holdingProcedures).toBeGreaterThan(0)
    })

    function instrumentPack(date: string, extra: Partial<LogEntry> = {}): LogEntry {
      return createTestEntry({
        date,
        flightConditions: ['IFR'],
        performance: {
          dayTakeoffs: 0,
          dayLandings: 0,
          nightTakeoffs: null,
          nightLandings: null,
          approachCount: 6,
          holdingProcedures: 1,
        },
        ...extra,
      })
    }

    function expectYmd(date: Date, ymd: string) {
      expect(localYmd(date)).toBe(ymd)
    }

    // 14 CFR 61.57(c): 6 calendar months, through the end of the 6th calendar month.
    it('stays current through the last day of the 6th calendar month, not a rolling 6-month date', () => {
      const pack = [instrumentPack('2024-01-31')]
      const lastDay = calculateInstrumentCurrency(pack, new Date(2024, 6, 31))
      expect(lastDay.isCurrent).toBe(true)
      expect(lastDay.status).not.toBe('grace_period')
      expectYmd(lastDay.expirationDate, '2024-07-31')

      const nextDay = calculateInstrumentCurrency(pack, new Date(2024, 7, 1))
      expect(nextDay.isCurrent).toBe(false)
      expect(nextDay.status).toBe('grace_period')
      expectYmd(nextDay.expirationDate, '2025-01-31')
    })

    it('uses the 6-calendar-month grace period then requires an IPC (61.57(d))', () => {
      const pack = [instrumentPack('2024-01-15')]
      const lastGraceDay = calculateInstrumentCurrency(pack, new Date(2025, 0, 31))
      expect(lastGraceDay.isCurrent).toBe(false)
      expect(lastGraceDay.status).toBe('grace_period')
      expect(lastGraceDay.needsIpc).toBe(false)
      expectYmd(lastGraceDay.expirationDate, '2025-01-31')

      const needsIpc = calculateInstrumentCurrency(pack, new Date(2025, 1, 1))
      expect(needsIpc.isCurrent).toBe(false)
      expect(needsIpc.status).toBe('expired')
      expect(needsIpc.needsIpc).toBe(true)
    })

    it('counts a structured IPC tag as restoring currency (61.57(d))', () => {
      const entries = [
        createTestEntry({
          date: '2024-03-10',
          tags: ['IPC'],
        }),
      ]
      const stillCurrent = calculateInstrumentCurrency(entries, new Date(2024, 8, 30))
      expect(stillCurrent.isCurrent).toBe(true)
      expect(stillCurrent.restoredByIpc).toBe(true)
      expectYmd(stillCurrent.expirationDate, '2024-09-30')

      const grace = calculateInstrumentCurrency(entries, new Date(2024, 9, 1))
      expect(grace.status).toBe('grace_period')
      expectYmd(grace.expirationDate, '2025-03-31')

      const expired = calculateInstrumentCurrency(entries, new Date(2025, 3, 1))
      expect(expired.needsIpc).toBe(true)
    })

    it('does not treat IPC in remarks as an IPC', () => {
      const entries = [
        createTestEntry({
          date: '2024-03-10',
          remarks: 'Completed IPC with examiner',
        }),
      ]
      const result = calculateInstrumentCurrency(entries, new Date(2024, 3, 1))
      expect(result.isCurrent).toBe(false)
      expect(result.restoredByIpc).toBeFalsy()
      expect(result.needsIpc).toBe(true)
    })

    it('handles leap-year end of the 6th calendar month (Aug 31 → Feb 29)', () => {
      const pack = [instrumentPack('2023-08-31')]
      const leapDay = calculateInstrumentCurrency(pack, new Date(2024, 1, 29))
      expect(leapDay.isCurrent).toBe(true)
      expectYmd(leapDay.expirationDate, '2024-02-29')

      const march1 = calculateInstrumentCurrency(pack, new Date(2024, 2, 1))
      expect(march1.isCurrent).toBe(false)
      expect(march1.status).toBe('grace_period')
    })

    it('handles Feb 29 activity through August 31 of a leap year', () => {
      const pack = [instrumentPack('2024-02-29')]
      const aug31 = calculateInstrumentCurrency(pack, new Date(2024, 7, 31))
      expect(aug31.isCurrent).toBe(true)
      expectYmd(aug31.expirationDate, '2024-08-31')

      const sep1 = calculateInstrumentCurrency(pack, new Date(2024, 8, 1))
      expect(sep1.status).toBe('grace_period')
    })
  })

  describe('calculateFlightReview (14 CFR 61.56)', () => {
    it('asks to add a flight review when no structured tag exists', () => {
      const today = new Date(2024, 5, 15)
      const entries = [
        createTestEntry({
          date: '2024-01-01',
          remarks: 'Completed flight review with CFI',
          tags: ['Checkride'],
        }),
      ]
      const result = calculateFlightReview(entries, today)
      expect(result.status).toBe('missing')
      expect(result.isCurrent).toBe(false)
    })

    it('is current through the last day of the 24th calendar month after the review month', () => {
      const entries = [
        createTestEntry({
          date: '2024-01-15',
          tags: ['Flight Review'],
        }),
      ]
      const lastDay = calculateFlightReview(entries, new Date(2026, 0, 31))
      expect(lastDay.isCurrent).toBe(true)
      expect(localYmd(lastDay.expirationDate)).toBe('2026-01-31')

      const nextDay = calculateFlightReview(entries, new Date(2026, 1, 1))
      expect(nextDay.isCurrent).toBe(false)
      expect(nextDay.status).toBe('expired')
    })

    it('uses the most recent Flight Review tag', () => {
      const entries = [
        createTestEntry({ date: '2022-01-01', tags: ['Flight Review'], id: 'old' }),
        createTestEntry({ date: '2024-06-01', tags: ['Flight Review'], id: 'new' }),
      ]
      const result = calculateFlightReview(entries, new Date(2025, 0, 1))
      expect(result.isCurrent).toBe(true)
      expect(result.qualifyingEntries[0]?.id).toBe('new')
      expect(localYmd(result.expirationDate)).toBe('2026-06-30')
    })

    it('handles a Feb 29 review through Feb 28 of the 24th calendar month', () => {
      const entries = [
        createTestEntry({
          date: '2024-02-29',
          tags: ['Flight Review'],
        }),
      ]
      const lastDay = calculateFlightReview(entries, new Date(2026, 1, 28))
      expect(lastDay.isCurrent).toBe(true)
      expect(localYmd(lastDay.expirationDate)).toBe('2026-02-28')

      const march1 = calculateFlightReview(entries, new Date(2026, 2, 1))
      expect(march1.isCurrent).toBe(false)
    })

    it('matches Flight Review tags case-insensitively and ignores remarks', () => {
      const tagged = calculateFlightReview(
        [createTestEntry({ date: '2024-03-01', tags: ['flight review'] })],
        new Date(2024, 5, 1)
      )
      expect(tagged.isCurrent).toBe(true)

      const remarksOnly = calculateFlightReview(
        [createTestEntry({ date: '2024-03-01', remarks: 'flight review done' })],
        new Date(2024, 5, 1)
      )
      expect(remarksOnly.status).toBe('missing')
    })
  })

  describe('calculateAnnualRequirements', () => {
    it('is missing when no Flight Review tag exists', () => {
      const result = calculateAnnualRequirements([])

      expect(result.isCurrent).toBe(false)
      expect(result.status).toBe('missing')
      expect(result.requirements).toEqual([])
    })

    it('uses the tagged flight review, not untagged entries in the last year', () => {
      const today = new Date(2024, 2, 15)
      const entries: LogEntry[] = [
        createTestEntry({ date: '2023-09-01' }),
        createTestEntry({
          date: '2023-03-01',
          tags: ['Flight Review'],
        }),
      ]

      const result = calculateAnnualRequirements(entries, today)

      expect(result.isCurrent).toBe(true)
      expect(result.status).toBe('current')
      expect(result.qualifyingEntries).toHaveLength(1)
      expect(result.qualifyingEntries[0]?.date).toBe('2023-03-01')
    })
  })

  describe('formatCurrencyChip', () => {
    const ref = new Date('2026-04-01T12:00:00')

    function status(partial: Partial<CurrencyStatus>): CurrencyStatus {
      return {
        isCurrent: true,
        daysRemaining: 60,
        expirationDate: new Date('2026-04-12T12:00:00'),
        status: 'current',
        qualifyingEntries: [],
        ...partial,
      }
    }

    it('formats current chips with short date', () => {
      expect(formatCurrencyChip('passenger', status({}), ref)).toBe('90-day ✓ until Apr 12')
      expect(formatCurrencyChip('night', status({}), ref)).toBe('Night ✓ until Apr 12')
      expect(formatCurrencyChip('instrument', status({}), ref)).toBe('IFR ✓ until Apr 12')
    })

    it('includes year when expiration is not this year', () => {
      expect(
        formatCurrencyChip(
          'instrument',
          status({ expirationDate: new Date('2027-10-03T12:00:00') }),
          ref
        )
      ).toBe('IFR ✓ until Oct 3, 2027')
    })

    it('formats expiring soon with day counts', () => {
      expect(
        formatCurrencyChip(
          'night',
          status({ status: 'expiring_soon', daysRemaining: 8, isCurrent: true }),
          ref
        )
      ).toBe('Night expires in 8 days')
      expect(
        formatCurrencyChip(
          'passenger',
          status({ status: 'expiring_soon', daysRemaining: 1, isCurrent: true }),
          ref
        )
      ).toBe('90-day expires in 1 day')
      expect(
        formatCurrencyChip(
          'instrument',
          status({ status: 'expiring_soon', daysRemaining: 0, isCurrent: true }),
          ref
        )
      ).toBe('IFR expires today')
    })

    it('formats expired', () => {
      expect(
        formatCurrencyChip(
          'passenger',
          status({ status: 'expired', isCurrent: false, daysRemaining: 0 }),
          ref
        )
      ).toBe('90-day expired')
    })

    it('formats IFR grace and IPC-required expired', () => {
      expect(
        formatCurrencyChip(
          'instrument',
          status({
            status: 'grace_period',
            isCurrent: false,
            expirationDate: new Date(2026, 0, 31, 12),
          }),
          ref
        )
      ).toBe('IFR grace until Jan 31')
      expect(
        formatCurrencyChip(
          'instrument',
          status({ status: 'expired', isCurrent: false, needsIpc: true, daysRemaining: 0 }),
          ref
        )
      ).toBe('IFR expired, needs IPC')
    })

    it('formats missing flight review', () => {
      expect(
        formatCurrencyChip(
          'flight_review',
          status({ status: 'missing', isCurrent: false, daysRemaining: 0 }),
          ref
        )
      ).toBe('Add your last flight review')
    })

    it('formats null currency as em dash', () => {
      expect(formatCurrencyChip('passenger', null, ref)).toBe('90-day —')
    })

    it('formatCurrencyChipDate omits same-year', () => {
      // Local noon avoids UTC date-string timezone shift (Apr 11 vs Apr 12).
      expect(formatCurrencyChipDate(new Date(2026, 3, 12, 12), ref)).toBe('Apr 12')
      expect(formatCurrencyChipDate(new Date(2027, 3, 12, 12), ref)).toBe('Apr 12, 2027')
    })
  })
})
