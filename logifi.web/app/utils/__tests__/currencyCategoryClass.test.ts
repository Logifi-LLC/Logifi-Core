import { describe, expect, it } from 'vitest'
import {
  calculateInstrumentCurrency,
  calculateNightCurrency,
  calculatePassengerCurrency,
  calculatePassengerCurrencyGroups,
  calculateFlightReview,
  icaoTypeDesignatorFromMakeModel,
  normalizeCategoryClassForCurrency,
  summarizePassengerCurrencyFromGroups,
} from '../currencyCalculator'
import type { LogEntry, PerformanceMetrics } from '../logbookTypes'

/**
 * Known-answer fixtures are fictional. Dates are local calendar days.
 */
describe('61.57(a)/(b) category/class/type passenger currency', () => {
  const localYmd = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  function performance(partial: Partial<PerformanceMetrics>): PerformanceMetrics {
    return {
      dayTakeoffs: 0,
      dayLandings: 0,
      nightTakeoffs: null,
      nightLandings: null,
      approachCount: null,
      holdingProcedures: null,
      ...partial,
    }
  }

  function entry(overrides: Partial<LogEntry>): LogEntry {
    return {
      id: overrides.id ?? `e-${overrides.date ?? 'x'}`,
      date: '2024-01-01',
      role: 'PIC',
      aircraftCategoryClass: 'ASEL',
      categoryClassTime: null,
      aircraftMakeModel: 'Cessna 172',
      registration: 'N100FA',
      flightNumber: null,
      departure: 'KOSH',
      destination: 'KMSN',
      route: '',
      trainingElements: '',
      trainingInstructor: '',
      instructorCertificate: '',
      flightConditions: [],
      remarks: '',
      flightTime: {
        total: 1.0,
        pic: 1.0,
        sic: null,
        dual: null,
        solo: null,
        night: null,
        actualInstrument: null,
        simulatedInstrument: null,
        crossCountry: null,
      },
      performance: performance({}),
      ...overrides,
    }
  }

  function group(groups: ReturnType<typeof calculatePassengerCurrencyGroups>, kind: 'category_class' | 'type', key: string) {
    return groups.find((g) => g.kind === kind && g.key === key)
  }

  describe('normalizeCategoryClassForCurrency', () => {
    it('maps structured form codes and 8710 labels, not free text', () => {
      expect(normalizeCategoryClassForCurrency('ASEL')).toBe('ASEL')
      expect(normalizeCategoryClassForCurrency('Airplane SEL')).toBe('ASEL')
      expect(normalizeCategoryClassForCurrency('AMEL')).toBe('AMEL')
      expect(normalizeCategoryClassForCurrency('Airplane MEL')).toBe('AMEL')
      expect(normalizeCategoryClassForCurrency('HELI')).toBe('HELI')
      expect(normalizeCategoryClassForCurrency('WSC-L')).toBe('WSC-L')
      // Free-text make/model and unlisted phrases are not guessed.
      expect(normalizeCategoryClassForCurrency('Cessna 172')).toBeNull()
      expect(normalizeCategoryClassForCurrency('Fixed wing single-engine land')).toBeNull()
    })
  })

  describe('icaoTypeDesignatorFromMakeModel', () => {
    it('accepts ICAO Doc 8643 designators and rejects make/model strings', () => {
      expect(icaoTypeDesignatorFromMakeModel('E170')).toBe('E170')
      expect(icaoTypeDesignatorFromMakeModel('B737')).toBe('B737')
      expect(icaoTypeDesignatorFromMakeModel('PA-28')).toBe('PA28')
      expect(icaoTypeDesignatorFromMakeModel('C172')).toBe('C172')
      expect(icaoTypeDesignatorFromMakeModel('Cessna 172')).toBeNull()
      expect(icaoTypeDesignatorFromMakeModel('EMBRAER (Brazil) EMB-170/175')).toBeNull()
      expect(icaoTypeDesignatorFromMakeModel('ERJ-170')).toBeNull()
    })
  })

  describe('mixed ASEL / AMEL (14 CFR 61.57(a)(1)(ii))', () => {
    const today = new Date(2024, 2, 15)

    it('does not let ASEL landings satisfy AMEL passenger currency', () => {
      const entries = [
        entry({
          id: 'asel-1',
          date: '2024-03-01',
          aircraftCategoryClass: 'ASEL',
          aircraftMakeModel: 'Cessna 172',
          performance: performance({ dayTakeoffs: 3, dayLandings: 3 }),
        }),
        entry({
          id: 'amel-1',
          date: '2024-03-10',
          aircraftCategoryClass: 'AMEL',
          aircraftMakeModel: 'Beechcraft Baron',
          performance: performance({ dayTakeoffs: 1, dayLandings: 1 }),
        }),
      ]

      const groups = calculatePassengerCurrencyGroups(entries, today)
      const asel = group(groups, 'category_class', 'ASEL')
      const amel = group(groups, 'category_class', 'AMEL')

      expect(asel?.passenger.isCurrent).toBe(true)
      expect(asel?.passenger.landings).toBe(3)
      expect(amel?.passenger.isCurrent).toBe(false)
      expect(amel?.passenger.landings).toBe(1)
      // Pooled 61.57(a) still sees 4 landings; the chip summary must not.
      expect(calculatePassengerCurrency(entries, today).isCurrent).toBe(true)
      const summary = summarizePassengerCurrencyFromGroups(
        groups,
        calculatePassengerCurrency(entries, today),
        'passenger'
      )
      expect(summary.isCurrent).toBe(false)
      expect(summary.status).toBe('expired')
      expect(summary.landings).toBe(1)
    })

    it('maps Airplane SEL and ASEL into one class group', () => {
      const entries = [
        entry({
          date: '2024-03-01',
          aircraftCategoryClass: 'Airplane SEL',
          performance: performance({ dayTakeoffs: 2, dayLandings: 2 }),
        }),
        entry({
          date: '2024-03-05',
          aircraftCategoryClass: 'ASEL',
          performance: performance({ dayTakeoffs: 1, dayLandings: 1 }),
        }),
      ]
      const groups = calculatePassengerCurrencyGroups(entries, today)
      expect(group(groups, 'category_class', 'ASEL')?.passenger.landings).toBe(3)
      expect(groups.filter((g) => g.kind === 'category_class')).toHaveLength(1)
    })
  })

  describe('type-rated jet (14 CFR 61.57(a)(1)(ii) type)', () => {
    const today = new Date(2024, 2, 15)

    it('counts E170 landings toward AMEL class and E170 type, not ASEL', () => {
      const entries = [
        entry({
          id: 'e170',
          date: '2024-03-01',
          aircraftCategoryClass: 'AMEL',
          aircraftMakeModel: 'E170',
          performance: performance({ dayTakeoffs: 3, dayLandings: 3 }),
        }),
        entry({
          id: 'asel',
          date: '2024-03-02',
          aircraftCategoryClass: 'ASEL',
          aircraftMakeModel: 'Cessna 172',
          performance: performance({ dayTakeoffs: 3, dayLandings: 3 }),
        }),
      ]
      const groups = calculatePassengerCurrencyGroups(entries, today)
      expect(group(groups, 'category_class', 'ASEL')?.passenger.isCurrent).toBe(true)
      expect(group(groups, 'category_class', 'AMEL')?.passenger.isCurrent).toBe(true)
      expect(group(groups, 'type', 'E170')?.passenger.isCurrent).toBe(true)
      expect(group(groups, 'type', 'E170')?.passenger.landings).toBe(3)
      expect(groups.some((g) => g.kind === 'type' && g.key === 'C172')).toBe(false)
    })

    it('does not let Baron AMEL landings satisfy E170 type currency', () => {
      const entries = [
        entry({
          id: 'baron',
          date: '2024-03-01',
          aircraftCategoryClass: 'AMEL',
          aircraftMakeModel: 'Beechcraft Baron',
          performance: performance({ dayTakeoffs: 3, dayLandings: 3 }),
        }),
        entry({
          id: 'e170-old',
          date: '2023-06-01',
          aircraftCategoryClass: 'AMEL',
          aircraftMakeModel: 'E170',
          performance: performance({ dayTakeoffs: 10, dayLandings: 10 }),
        }),
      ]
      const groups = calculatePassengerCurrencyGroups(entries, today)
      expect(group(groups, 'category_class', 'AMEL')?.passenger.isCurrent).toBe(true)
      expect(group(groups, 'type', 'E170')?.passenger.isCurrent).toBe(false)
      // Compact chip follows category/class only (type-rating-required is unknown).
      const summary = summarizePassengerCurrencyFromGroups(
        groups,
        calculatePassengerCurrency(entries, today),
        'passenger'
      )
      expect(summary.isCurrent).toBe(true)
    })
  })

  describe('90-day month-boundary window (14 CFR 61.57(a))', () => {
    it('includes a class landing on the 90th preceding day and excludes the 91st', () => {
      // 2024-03-01 minus 90 days = 2023-12-02 (Feb 2024 has 29 days).
      const today = new Date(2024, 2, 1)
      const entries = [
        entry({
          id: 'asel-on',
          date: '2023-12-02',
          aircraftCategoryClass: 'ASEL',
          aircraftMakeModel: 'Cessna 172',
          performance: performance({ dayTakeoffs: 3, dayLandings: 3 }),
        }),
        entry({
          id: 'amel-off',
          date: '2023-12-01',
          aircraftCategoryClass: 'AMEL',
          aircraftMakeModel: 'Beechcraft Baron',
          performance: performance({ dayTakeoffs: 10, dayLandings: 10 }),
        }),
      ]
      const groups = calculatePassengerCurrencyGroups(entries, today)
      expect(group(groups, 'category_class', 'ASEL')?.passenger.isCurrent).toBe(true)
      expect(group(groups, 'category_class', 'AMEL')?.passenger.isCurrent).toBe(false)
    })
  })

  describe('night per class (14 CFR 61.57(b)(1)(ii))', () => {
    const today = new Date(2024, 2, 15)

    it('requires night full-stop landings in the same category/class', () => {
      const entries = [
        entry({
          id: 'asel-night',
          date: '2024-03-01',
          aircraftCategoryClass: 'ASEL',
          aircraftMakeModel: 'Cessna 172',
          flightConditions: ['nightVfr'],
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
          performance: performance({ nightTakeoffs: 3, nightLandings: 3 }),
        }),
        entry({
          id: 'amel-day',
          date: '2024-03-02',
          aircraftCategoryClass: 'AMEL',
          aircraftMakeModel: 'Beechcraft Baron',
          performance: performance({ dayTakeoffs: 5, dayLandings: 5 }),
        }),
      ]
      const groups = calculatePassengerCurrencyGroups(entries, today)
      expect(group(groups, 'category_class', 'ASEL')?.night.isCurrent).toBe(true)
      expect(group(groups, 'category_class', 'AMEL')?.night.isCurrent).toBe(false)
      expect(group(groups, 'category_class', 'AMEL')?.night.landings).toBe(0)
      expect(calculateNightCurrency(entries, today).isCurrent).toBe(true)
      const summary = summarizePassengerCurrencyFromGroups(
        groups,
        calculateNightCurrency(entries, today),
        'night'
      )
      expect(summary.isCurrent).toBe(false)
    })
  })

  describe('does not change 61.57(c)/(d) or 61.56', () => {
    it('still pools instrument tasks across category/class', () => {
      const today = new Date(2024, 2, 15)
      const entries = [
        entry({
          date: '2024-01-15',
          aircraftCategoryClass: 'ASEL',
          flightConditions: ['IFR'],
          performance: performance({ approachCount: 3, holdingProcedures: 1 }),
        }),
        entry({
          date: '2024-01-20',
          aircraftCategoryClass: 'AMEL',
          aircraftMakeModel: 'E170',
          flightConditions: ['IFR'],
          performance: performance({ approachCount: 3 }),
        }),
      ]
      const ifr = calculateInstrumentCurrency(entries, today)
      expect(ifr.isCurrent).toBe(true)
      expect(ifr.approaches).toBe(6)
    })

    it('still uses the Flight Review tag, not category/class', () => {
      const result = calculateFlightReview(
        [
          entry({
            date: '2024-01-15',
            aircraftCategoryClass: 'AMEL',
            tags: ['Flight Review'],
          }),
        ],
        new Date(2025, 0, 1)
      )
      expect(result.isCurrent).toBe(true)
      expect(localYmd(result.expirationDate)).toBe('2026-01-31')
    })
  })

  it('omits simulator and void rows from 61.57(a)/(b) groups', () => {
    const today = new Date(2024, 2, 15)
    const entries = [
      entry({
        id: 'sim',
        date: '2024-03-01',
        logbookType: 'simulator',
        aircraftCategoryClass: 'ASEL',
        performance: performance({ dayTakeoffs: 3, dayLandings: 3 }),
      }),
      entry({
        id: 'void',
        date: '2024-03-01',
        isVoid: true,
        aircraftCategoryClass: 'AMEL',
        performance: performance({ dayTakeoffs: 3, dayLandings: 3 }),
      }),
    ]
    expect(calculatePassengerCurrencyGroups(entries, today)).toEqual([])
  })
})
