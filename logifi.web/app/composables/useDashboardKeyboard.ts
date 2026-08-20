import { onMounted, onUnmounted, type Ref } from 'vue'

export interface DashboardKeyboardDeps {
  searchInput: Ref<HTMLInputElement | null>
  searchTerm: Ref<string>
  isEntryFormOpen: Ref<boolean>
  expandedEntryId: Ref<string | null>
  showCurrencyDashboard: Ref<boolean>
  showCrewProfileModal: Ref<boolean>
  isCatalogDrawerOpen: Ref<boolean>
  showSettingsModal: Ref<boolean>
  showAuthModal: Ref<boolean>
  openAddEntry: () => void
  closeAddEntry: () => void
  cancelInlineEdit: () => void
  closeCrewProfileModal: () => void
  closeCatalogDrawer: () => void
  closeCurrencyDashboard: () => void
}

export function isDashboardTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}

export function isSearchInput(target: EventTarget | null, searchInput: HTMLInputElement | null): boolean {
  if (!(target instanceof HTMLElement) || !searchInput) return false
  return target === searchInput
}

function isModifiedKey(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey || event.altKey
}

export function createDashboardKeydownHandler(deps: DashboardKeyboardDeps) {
  return (event: KeyboardEvent) => {
    if (isModifiedKey(event)) return

    const typing = isDashboardTypingTarget(event.target)
    const searchEl = deps.searchInput.value
    const inSearch = isSearchInput(event.target, searchEl)
    const blockingModal =
      deps.showSettingsModal.value ||
      deps.showAuthModal.value ||
      deps.showCurrencyDashboard.value ||
      deps.showCrewProfileModal.value

    if (event.key === 'Escape') {
      if (deps.showCurrencyDashboard.value) {
        deps.closeCurrencyDashboard()
        event.preventDefault()
        return
      }
      if (deps.showCrewProfileModal.value) {
        deps.closeCrewProfileModal()
        event.preventDefault()
        return
      }
      if (deps.isCatalogDrawerOpen.value) {
        deps.closeCatalogDrawer()
        event.preventDefault()
        return
      }
      if (deps.isEntryFormOpen.value) {
        deps.closeAddEntry()
        event.preventDefault()
        return
      }
      if (deps.expandedEntryId.value !== null) {
        deps.cancelInlineEdit()
        event.preventDefault()
        return
      }
      if (inSearch) {
        if (deps.searchTerm.value) {
          deps.searchTerm.value = ''
        } else {
          searchEl?.blur()
        }
        event.preventDefault()
      }
      return
    }

    if (event.key === '/') {
      if (inSearch) return
      if (deps.showSettingsModal.value || deps.showAuthModal.value) return
      event.preventDefault()
      searchEl?.focus()
      return
    }

    if (event.key === 'n' || event.key === 'N') {
      if (typing) return
      if (blockingModal) return
      if (deps.isEntryFormOpen.value) return
      event.preventDefault()
      deps.openAddEntry()
    }
  }
}

export function useDashboardKeyboard(deps: DashboardKeyboardDeps) {
  const handler = createDashboardKeydownHandler(deps)

  onMounted(() => {
    document.addEventListener('keydown', handler)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handler)
  })
}
