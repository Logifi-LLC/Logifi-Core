import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LogEntryCard from '../../app/components/logbook/LogEntryCard.vue'
import {
  createEmptyFlightTime,
  createEmptyPerformance,
  type LogbookColumnConfig,
  type LogEntry,
} from '../../app/utils/logbookTypes'

function entry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'test-id',
    date: '2026-08-26',
    role: 'PIC',
    aircraftCategoryClass: 'AMEL',
    categoryClassTime: null,
    aircraftMakeModel: 'ERJ-170/175',
    registration: 'N824MD',
    flightNumber: '5643',
    departure: 'KLGA',
    destination: 'KSDF',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: ['ifr', 'crossCountry'],
    remarks: '',
    tags: [],
    logbookType: 'flight',
    flightTime: { ...createEmptyFlightTime(), total: 2.2 },
    performance: createEmptyPerformance(),
    flagged: false,
    ...overrides,
  }
}

function field(key: LogbookColumnConfig['key'], label: string): LogbookColumnConfig {
  return { key, label, visible: true, order: 0, required: false }
}

function mountCard(options?: {
  entry?: LogEntry
  visibleDetailFields?: LogbookColumnConfig[]
}) {
  return mount(LogEntryCard, {
    props: {
      entry: options?.entry ?? entry(),
      isDarkMode: false,
      visibleDetailFields: options?.visibleDetailFields ?? [],
      showRemarksFooter: false,
    },
    global: {
      stubs: {
        Icon: true,
      },
    },
  })
}

describe('LogEntryCard flight number', () => {
  it('shows the number in the header and not as a chip when the field is enabled', () => {
    const wrapper = mountCard({
      visibleDetailFields: [
        field('flightNumber', 'Flight Number'),
        field('conditions', 'Conditions'),
      ],
    })

    const flightNumber = wrapper.get('[data-testid="header-flight-number"]')
    expect(flightNumber.text()).toBe('5643')
    expect(wrapper.text()).not.toContain('Flight Number:')
    expect(wrapper.text()).toContain('IFR')
    expect(wrapper.html().indexOf('PIC')).toBeLessThan(wrapper.html().indexOf('5643'))
    expect(wrapper.html().indexOf('5643')).toBeLessThan(wrapper.html().indexOf('2.2'))
  })

  it('omits the header number when the field is turned off', () => {
    const wrapper = mountCard({
      visibleDetailFields: [field('conditions', 'Conditions')],
    })

    expect(wrapper.find('[data-testid="header-flight-number"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('5643')
    expect(wrapper.text()).not.toContain('Flight Number:')
  })

  it('omits the header number when the field is enabled but the value is empty', () => {
    const wrapper = mountCard({
      entry: entry({ flightNumber: '   ' }),
      visibleDetailFields: [field('flightNumber', 'Flight Number')],
    })

    expect(wrapper.find('[data-testid="header-flight-number"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Flight Number:')
  })
})

describe('LogEntryCard pilots', () => {
  it('shows names as a line of text and not as a chip when the field is enabled', () => {
    const wrapper = mountCard({
      entry: entry({
        trainingElements: 'Christopher White',
        performance: { ...createEmptyPerformance(), dayLandings: 1 },
      }),
      visibleDetailFields: [
        field('pilots', 'Pilots'),
        field('conditions', 'Conditions'),
        field('dayLandings', 'Day Landings'),
      ],
    })

    const pilotsLine = wrapper.get('[data-testid="pilots-line"]')
    expect(pilotsLine.text()).toBe('Christopher White')
    expect(pilotsLine.classes()).toContain('text-right')
    expect(wrapper.text()).not.toContain('Pilots:')
    expect(wrapper.text()).toContain('IFR')
    expect(wrapper.text()).toContain('Day Landings: 1')
  })

  it('omits the pilots line when the field is turned off', () => {
    const wrapper = mountCard({
      entry: entry({ trainingElements: 'Christopher White' }),
      visibleDetailFields: [field('conditions', 'Conditions')],
    })

    expect(wrapper.find('[data-testid="pilots-line"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Christopher White')
    expect(wrapper.text()).not.toContain('Pilots:')
  })

  it('omits the pilots line when the field is enabled but the value is empty', () => {
    const wrapper = mountCard({
      entry: entry({ trainingElements: '   ' }),
      visibleDetailFields: [field('pilots', 'Pilots')],
    })

    expect(wrapper.find('[data-testid="pilots-line"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Pilots:')
  })
})
