import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import HeaderUtcClockBar from '../HeaderUtcClockBar.vue'
import Far117HeaderStatusDot from '../Far117HeaderStatusDot.vue'
import { setFar117LookbackFlightEntries } from '~/utils/far117LookbackEntryCache'
import type { LogEntry } from '~/utils/logbookTypes'
import { createEmptyFlightTime, createEmptyPerformance } from '~/utils/logbookTypes'
import type { Far117FlightTimeLookbacks } from '~/utils/far117FlightTimeLookback'

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

const normalLookbacks: Far117FlightTimeLookbacks = {
  computedAtIso: '2026-11-14T12:00:00.000Z',
  consecutive672Hours: {
    usedHours: 37,
    remainingHours: 63,
    limitHours: 100,
    windowLabel: 'Past 672 consecutive hours',
    usedWholeDayApproximation: false,
  },
  consecutive365CalendarDays: {
    usedHours: 500,
    remainingHours: 500,
    limitHours: 1000,
    windowLabel: 'Past 365 calendar days',
    usedWholeDayApproximation: false,
  },
}

vi.mock('~/utils/far117FlightTimeLookback', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/far117FlightTimeLookback')>()
  return {
    ...actual,
    calculateFar117FlightTimeLookbacks: vi.fn(() => normalLookbacks),
  }
})

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
    expect(wrapper.find('[data-testid="far117-header-status-dot"]').exists()).toBe(
      false,
    )
  })

  it('hides the dot when both lookbacks are normal', () => {
    showFar117.value = true
    const wrapper = mount(HeaderUtcClockBar, {
      props: {
        displayClock: '21:30 UTC',
        isDarkMode: false,
      },
    })
    expect(wrapper.find('[data-testid="far117-header-status-dot"]').exists()).toBe(
      false,
    )
  })

  it('shows an amber dot when either lookback is near limit', async () => {
    const { calculateFar117FlightTimeLookbacks } = await import(
      '~/utils/far117FlightTimeLookback'
    )
    vi.mocked(calculateFar117FlightTimeLookbacks).mockReturnValue({
      ...normalLookbacks,
      consecutive672Hours: {
        ...normalLookbacks.consecutive672Hours,
        usedHours: 85,
        remainingHours: 15,
      },
    })
    showFar117.value = true
    const wrapper = mount(HeaderUtcClockBar, {
      props: { displayClock: '21:30 UTC', isDarkMode: false },
    })
    const dot = wrapper.find('[data-testid="far117-header-status-dot"]')
    expect(dot.exists()).toBe(true)
    expect(dot.find('.bg-amber-600').exists()).toBe(true)
  })

  it('shows a red dot using worst-of-two when 365 is critical', async () => {
    const { calculateFar117FlightTimeLookbacks } = await import(
      '~/utils/far117FlightTimeLookback'
    )
    vi.mocked(calculateFar117FlightTimeLookbacks).mockReturnValue({
      ...normalLookbacks,
      consecutive365CalendarDays: {
        ...normalLookbacks.consecutive365CalendarDays,
        usedHours: 996,
        remainingHours: 4,
      },
    })
    showFar117.value = true
    const wrapper = mount(HeaderUtcClockBar, {
      props: { displayClock: '21:30 UTC', isDarkMode: true },
    })
    expect(wrapper.find('.bg-rose-400').exists()).toBe(true)
  })

  it('opens the popover with both lookback lines on click', async () => {
    const { calculateFar117FlightTimeLookbacks } = await import(
      '~/utils/far117FlightTimeLookback'
    )
    vi.mocked(calculateFar117FlightTimeLookbacks).mockReturnValue({
      ...normalLookbacks,
      consecutive672Hours: {
        ...normalLookbacks.consecutive672Hours,
        usedHours: 85,
        remainingHours: 15,
      },
    })
    showFar117.value = true
    const wrapper = mount(HeaderUtcClockBar, {
      props: { displayClock: '21:30 UTC', isDarkMode: false },
      attachTo: document.body,
    })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    const popover = wrapper.find('[data-testid="far117-header-status-popover"]')
    expect(popover.isVisible()).toBe(true)
    expect(popover.text()).toContain('672h · 85.0 / 100')
    expect(popover.text()).toContain('365d · 500.0 / 1000')
    expect(popover.text()).toContain('Informational only')
    wrapper.unmount()
  })

  it('hides the dot when signed out', () => {
    showFar117.value = true
    isAuthenticated.value = false
    const wrapper = mount(HeaderUtcClockBar, {
      props: { displayClock: '21:30 UTC', isDarkMode: false },
    })
    expect(wrapper.find('[data-testid="far117-header-status-dot"]').exists()).toBe(
      false,
    )
  })
})

describe('Far117HeaderStatusDot', () => {
  const nearLookbacks: Far117FlightTimeLookbacks = {
    ...normalLookbacks,
    consecutive672Hours: {
      ...normalLookbacks.consecutive672Hours,
      usedHours: 85,
      remainingHours: 15,
    },
  }

  it('renders popover lines with per-row colors', async () => {
    const wrapper = mount(Far117HeaderStatusDot, {
      props: { lookbacks: nearLookbacks, isDarkMode: false },
      attachTo: document.body,
    })
    await wrapper.find('button').trigger('click')
    const lines = wrapper.findAll('[data-testid="far117-lookback-line"]')
    expect(lines).toHaveLength(2)
    expect(lines[0]!.classes()).toContain('text-amber-600')
    expect(lines[1]!.classes()).toContain('text-gray-500')
    wrapper.unmount()
  })
})