export type DashboardShortcutAction = 'new-entry' | 'focus-search'

const NON_TYPING_INPUT_TYPES = new Set(['button', 'checkbox', 'radio', 'submit'])

function isTypingField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true

  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag !== 'INPUT') return false

  const type = ((target as HTMLInputElement).type || 'text').toLowerCase()
  return !NON_TYPING_INPUT_TYPES.has(type)
}

/**
 * Resolve N / / dashboard shortcuts. Ignores key repeat, IME composition,
 * meta/ctrl/alt, and typing fields so N in search still types an FAA tail.
 */
export function resolveDashboardShortcut(
  event: Pick<
    KeyboardEvent,
    'key' | 'repeat' | 'isComposing' | 'metaKey' | 'ctrlKey' | 'altKey' | 'target'
  >
): DashboardShortcutAction | null {
  if (event.repeat || event.isComposing) return null
  if (event.metaKey || event.ctrlKey || event.altKey) return null
  if (isTypingField(event.target)) return null

  if (event.key === 'n' || event.key === 'N') return 'new-entry'
  if (event.key === '/') return 'focus-search'
  return null
}
