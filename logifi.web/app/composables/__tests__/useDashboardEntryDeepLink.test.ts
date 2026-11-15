import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { LogEntry } from '~/utils/logbookTypes'
import { useDashboardEntryDeepLink } from '../useDashboardEntryDeepLink'

const replace = vi.fn()
const routeQuery = vi.hoisted(() => ({
  entry: 'entry-a' as string | undefined,
  returnTo: 'logbook-check' as string | undefined,
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/dashboard', query: routeQuery }),
  useRouter: () => ({ replace }),
}))

function makeEntry(id: string): LogEntry {
  return {
    id,
    date: '2024-01-01',
    aircraftId: 'N12345',
    aircraftType: 'C172',
    departure: 'KAPA',
    destination: 'KBJC',
    totalTime: 1,
    flightTime: 1,
    role: 'PIC',
    oooi: {},
  } as LogEntry
}

describe('useDashboardEntryDeepLink', () => {
  beforeEach(() => {
    replace.mockClear()
    routeQuery.entry = 'entry-a'
    routeQuery.returnTo = 'logbook-check'
  })

  it('captures inline return, opens entry, and strips entry and returnTo from the URL', async () => {
    const logEntries = ref<LogEntry[]>([makeEntry('entry-a')])
    const setActiveLogbook = vi.fn()
    const openEntry = vi.fn()
    const onInlineEditReturn = vi.fn()

    useDashboardEntryDeepLink({
      logEntries,
      setActiveLogbook,
      openEntry,
      onInlineEditReturn,
    })

    await flushPromises()

    expect(onInlineEditReturn).toHaveBeenCalledWith({
      entryId: 'entry-a',
      path: '/logbook-check',
    })
    expect(openEntry).toHaveBeenCalled()
    expect(replace).toHaveBeenCalledWith({
      path: '/dashboard',
      query: {},
    })
  })

  it('strips stale returnTo when no entry query is present', async () => {
    routeQuery.entry = undefined
    const logEntries = ref<LogEntry[]>([])

    useDashboardEntryDeepLink({
      logEntries,
      setActiveLogbook: vi.fn(),
      openEntry: vi.fn(),
    })

    await flushPromises()

    expect(replace).toHaveBeenCalledWith({
      path: '/dashboard',
      query: {},
    })
  })
})