import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import HeaderUtcClockBar from '../HeaderUtcClockBar.vue'
import { setFar117LookbackFlightEntries } from '~/utils/far117LookbackEntryCache'
import type { LogEntry } from '~/utils/logbookTypes'
import { createEmptyFlightTime, createEmptyPerformance } from '~/utils/logbookTypes'

const showFar117 = ref(false)
const isAuthenticated = ref(true)

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    user: ref({ id: 'user-1' }),
    isAuthenticated,
  }),
}))

vi.mock('~/composables/useFar117LookbackPreference', () => ({
  useFar117LookbackPreference: () => ({
    showFar117Lookbacks: showFar117,
    loadFar117LookbackPreference: vi.fn(),
  }),
}))

function flightEntry(id: string): LogEntry {
  return {
    id,
    date: '2026-11-14',
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
    flightTime: { ...createEmptyFlightTime(), total: 1 },
    performance: createEmptyPerformance(),
  }
}

describe('HeaderUtcClockBar', () => {
  beforeEach(() => {
    showFar117.value = false
    isAuthenticated.value = true
    setFar117LookbackFlightEntries([flightEntry('a')])
  })

  it('shows only the clock when the FAR 117 preference is off', () => {
    const wrapper = mount(HeaderUtcClockBar, {
      props: {
        displayClock: '21:30 UTC',
        isDarkMode: true,
        clockTextClass: 'text-gray-400',
      },
    })
    expect(wrapper.text()).toContain('21:30 UTC')
    expect(wrapper.findAll('[data-testid="far117-lookback-line"]').length).toBe(0)
  })

  it('flanks the clock with lookback lines when enabled and signed in', () => {
    showFar117.value = true
    const wrapper = mount(HeaderUtcClockBar, {
      props: {
        displayClock: '21:30 UTC',
        isDarkMode: false,
        clockTextClass: 'text-gray-600',
      },
    })
    const lines = wrapper.findAll('[data-testid="far117-lookback-line"]')
    expect(lines).toHaveLength(2)
    expect(lines[0]!.attributes('data-lookback')).toBe('672')
    expect(lines[1]!.attributes('data-lookback')).toBe('365')
  })

  it('hides lookbacks when signed out', () => {
    showFar117.value = true
    isAuthenticated.value = false
    const wrapper = mount(HeaderUtcClockBar, {
      props: {
        displayClock: '21:30 UTC',
        isDarkMode: false,
      },
    })
    expect(wrapper.findAll('[data-testid="far117-lookback-line"]').length).toBe(0)
  })
})