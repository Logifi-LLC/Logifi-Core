import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TotalsReportPanel from '../TotalsReportPanel.vue'
import { calculateTotalsReport } from '~/utils/totalsReport'
import type { LogEntry } from '~/utils/logbookTypes'
import { createEmptyFlightTime, createEmptyPerformance } from '~/utils/logbookTypes'

function entry(partial: Partial<LogEntry> & { id: string }): LogEntry {
  return {
    date: '2026-11-10',
    role: 'PIC',
    aircraftCategoryClass: 'ASEL',
    categoryClassTime: null,
    aircraftMakeModel: 'C172',
    registration: 'N100AA',
    flightNumber: null,
    departure: 'KPAO',
    destination: 'KSFO',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: [],
    remarks: '',
    flightTime: { ...createEmptyFlightTime(), total: 1.2, pic: 1.2 },
    performance: createEmptyPerformance(),
    ...partial,
  }
}

describe('TotalsReportPanel', () => {
  const report = calculateTotalsReport(
    [
      entry({ id: 'sel' }),
      entry({
        id: 'mel',
        aircraftCategoryClass: 'AMEL',
        aircraftMakeModel: 'E175',
        flightTime: { ...createEmptyFlightTime(), total: 2.0, sic: 2.0 },
      }),
      entry({
        id: 'sim',
        logbookType: 'simulator',
        aircraftMakeModel: 'B737 FFS',
        flightTime: { ...createEmptyFlightTime(), total: 1.5, ffs: 1.5 },
      }),
    ],
    'all',
    '2026-11-13'
  )

  it('renders stacked cards below the md breakpoint and a table from md up', () => {
    const wrapper = mount(TotalsReportPanel, {
      props: { report, isDarkMode: false },
    })

    const cardLists = wrapper.findAll('.md\\:hidden')
    const tables = wrapper.findAll('div.hidden.md\\:block')
    expect(cardLists.length).toBeGreaterThan(0)
    expect(tables.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('Airplane SEL')
    expect(wrapper.text()).toContain('E175')
    expect(wrapper.text()).toContain('Full Flight Simulator')
    expect(wrapper.text()).not.toMatch(/turbine/i)
    expect(wrapper.html()).not.toContain('overflow-x-scroll')
    expect(wrapper.html()).not.toContain('overflow-x-auto')
  })

  it('does not add simulator hours into the airplane grand total cell', () => {
    const wrapper = mount(TotalsReportPanel, {
      props: { report, isDarkMode: true },
    })
    expect(report.grandTotal.airplane.total).toBe(3.2)
    expect(wrapper.text()).toContain('3.2')
    expect(wrapper.text()).toContain('1.5')
  })
})
