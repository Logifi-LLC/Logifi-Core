import { onMounted, onUnmounted, toValue, type MaybeRefOrGetter } from 'vue'
import { resolveDashboardShortcut } from '../utils/dashboardShortcuts'

export function useDashboardShortcuts(options: {
  isBlocked: MaybeRefOrGetter<boolean>
  onNewEntry: () => void
  onFocusSearch: () => void
}): void {
  function onKeydown(event: KeyboardEvent): void {
    const action = resolveDashboardShortcut(event)
    if (!action) return
    if (toValue(options.isBlocked)) return

    if (action === 'focus-search') {
      event.preventDefault()
      options.onFocusSearch()
      return
    }

    options.onNewEntry()
  }

  onMounted(() => {
    document.addEventListener('keydown', onKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', onKeydown)
  })
}
