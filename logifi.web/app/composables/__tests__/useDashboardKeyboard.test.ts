import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import {
  createDashboardKeydownHandler,
  isDashboardTypingTarget,
  type DashboardKeyboardDeps,
} from '../useDashboardKeyboard'

function deps(overrides: Partial<DashboardKeyboardDeps> = {}): DashboardKeyboardDeps {
  return {
    searchInput: ref<HTMLInputElement | null>(null),
    searchTerm: ref(''),
    isEntryFormOpen: ref(false),
    expandedEntryId: ref<string | null>(null),
    showCurrencyDashboard: ref(false),
    showCrewProfileModal: ref(false),
    isCatalogDrawerOpen: ref(false),
    showSettingsModal: ref(false),
    showAuthModal: ref(false),
    openAddEntry: vi.fn(),
    closeAddEntry: vi.fn(),
    cancelInlineEdit: vi.fn(),
    closeCrewProfileModal: vi.fn(),
    closeCatalogDrawer: vi.fn(),
    closeCurrencyDashboard: vi.fn(),
    ...overrides,
  }
}

function keyEvent(
  key: string,
  target: EventTarget | null = document.body,
  extra: Partial<KeyboardEvent> = {}
): KeyboardEvent {
  return {
    key,
    target,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    ...extra,
  } as unknown as KeyboardEvent
}

describe('useDashboardKeyboard', () => {
  it('treats inputs as typing targets', () => {
    const input = document.createElement('input')
    expect(isDashboardTypingTarget(input)).toBe(true)
    expect(isDashboardTypingTarget(document.body)).toBe(false)
  })

  it('opens add entry on N when not typing', () => {
    const d = deps()
    const handler = createDashboardKeydownHandler(d)
    handler(keyEvent('n'))
    expect(d.openAddEntry).toHaveBeenCalledOnce()
  })

  it('does not steal N while typing a tail number', () => {
    const d = deps()
    const handler = createDashboardKeydownHandler(d)
    handler(keyEvent('N', document.createElement('input')))
    expect(d.openAddEntry).not.toHaveBeenCalled()
  })

  it('does not steal slash while settings is open', () => {
    const input = document.createElement('input')
    input.focus = vi.fn()
    const d = deps({
      searchInput: ref(input),
      showSettingsModal: ref(true),
    })
    const handler = createDashboardKeydownHandler(d)
    handler(keyEvent('/'))
    expect(input.focus).not.toHaveBeenCalled()
  })

  it('focuses search on /', () => {
    const input = document.createElement('input')
    input.focus = vi.fn()
    const d = deps({ searchInput: ref(input) })
    const handler = createDashboardKeydownHandler(d)
    const event = keyEvent('/')
    handler(event)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(input.focus).toHaveBeenCalled()
  })

  it('closes currency before other overlays on Esc', () => {
    const d = deps({
      showCurrencyDashboard: ref(true),
      isEntryFormOpen: ref(true),
    })
    const handler = createDashboardKeydownHandler(d)
    handler(keyEvent('Escape'))
    expect(d.closeCurrencyDashboard).toHaveBeenCalledOnce()
    expect(d.closeAddEntry).not.toHaveBeenCalled()
  })

  it('clears search text on Esc when the search box is focused', () => {
    const input = document.createElement('input')
    const searchTerm = ref('KORD')
    const d = deps({ searchInput: ref(input), searchTerm })
    const handler = createDashboardKeydownHandler(d)
    handler(keyEvent('Escape', input))
    expect(searchTerm.value).toBe('')
  })
})
