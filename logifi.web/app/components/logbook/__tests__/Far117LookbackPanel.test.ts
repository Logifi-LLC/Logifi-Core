import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Far117LookbackPanel from '../Far117LookbackPanel.vue'
import { FAR117_LOOKBACK_INFO_NOTE } from '~/utils/far117FlightTimeLookback'
import type { Far117FlightTimeLookbacks } from '~/utils/far117FlightTimeLookback'

const lookbacks: Far117FlightTimeLookbacks = {
  computedAtIso: '2026-11-14T12:00:00.000Z',
  consecutive672Hours: {
    usedHours: 37,
    remainingHours: 63,
    limitHours: 100,
    windowLabel: 'Past 672 consecutive hours',
    usedWholeDayApproximation: false,
  },
  consecutive365CalendarDays: {
    usedHours: 759.2,
    remainingHours: 240.8,
    limitHours: 1000,
    windowLabel: 'Past 365 calendar days',
    usedWholeDayApproximation: false,
  },
}

describe('Far117LookbackPanel', () => {
  it('renders compact 672h and 365d copy with informational title', () => {
    const h672 = mount(Far117LookbackPanel, {
      props: { side: '672', lookbacks, isDarkMode: false },
    })
    expect(h672.text()).toBe('672h · 37.0 / 100')
    expect(h672.attributes('title')).toBe(FAR117_LOOKBACK_INFO_NOTE)
    expect(h672.attributes('aria-label')).toContain('672-hour FAR 117 lookback')

    const d365 = mount(Far117LookbackPanel, {
      props: { side: '365', lookbacks, isDarkMode: true },
    })
    expect(d365.text()).toBe('365d · 759.2 / 1000')
    expect(d365.attributes('title')).toBe(FAR117_LOOKBACK_INFO_NOTE)
  })

  it('adds whole-day approximation copy to the 672h title when needed', () => {
    const approximated: Far117FlightTimeLookbacks = {
      ...lookbacks,
      consecutive672Hours: {
        ...lookbacks.consecutive672Hours,
        usedWholeDayApproximation: true,
      },
    }
    const wrapper = mount(Far117LookbackPanel, {
      props: { side: '672', lookbacks: approximated, isDarkMode: false },
    })
    expect(wrapper.attributes('title')).toContain('OOOI out')
    expect(wrapper.attributes('title')).toContain(FAR117_LOOKBACK_INFO_NOTE)
  })
})