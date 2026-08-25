import { describe, expect, it } from 'vitest'
import { resolveDashboardShortcut } from '../../app/utils/dashboardShortcuts'

function keyEvent(
  key: string,
  overrides: {
    target?: EventTarget | null
    repeat?: boolean
    isComposing?: boolean
    metaKey?: boolean
    ctrlKey?: boolean
    altKey?: boolean
  } = {}
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    metaKey: overrides.metaKey,
    ctrlKey: overrides.ctrlKey,
    altKey: overrides.altKey,
    repeat: overrides.repeat,
  })
  Object.defineProperty(event, 'target', {
    value: overrides.target ?? document.body,
  })
  Object.defineProperty(event, 'isComposing', {
    value: overrides.isComposing ?? false,
  })
  Object.defineProperty(event, 'repeat', {
    value: overrides.repeat ?? false,
  })
  return event
}

describe('resolveDashboardShortcut', () => {
  it('maps n and N to new-entry', () => {
    expect(resolveDashboardShortcut(keyEvent('n'))).toBe('new-entry')
    expect(resolveDashboardShortcut(keyEvent('N'))).toBe('new-entry')
  })

  it('maps / to focus-search', () => {
    expect(resolveDashboardShortcut(keyEvent('/'))).toBe('focus-search')
  })

  it('returns null for unrelated keys', () => {
    expect(resolveDashboardShortcut(keyEvent('Escape'))).toBeNull()
    expect(resolveDashboardShortcut(keyEvent('a'))).toBeNull()
  })

  it('ignores key repeat', () => {
    expect(resolveDashboardShortcut(keyEvent('n', { repeat: true }))).toBeNull()
    expect(resolveDashboardShortcut(keyEvent('/', { repeat: true }))).toBeNull()
  })

  it('ignores IME composition', () => {
    expect(resolveDashboardShortcut(keyEvent('n', { isComposing: true }))).toBeNull()
  })

  it('ignores meta, ctrl, and alt modifiers', () => {
    expect(resolveDashboardShortcut(keyEvent('n', { metaKey: true }))).toBeNull()
    expect(resolveDashboardShortcut(keyEvent('n', { ctrlKey: true }))).toBeNull()
    expect(resolveDashboardShortcut(keyEvent('/', { altKey: true }))).toBeNull()
  })

  it('lets N type in search and other typing fields', () => {
    const search = document.createElement('input')
    search.type = 'search'
    expect(resolveDashboardShortcut(keyEvent('n', { target: search }))).toBeNull()
    expect(resolveDashboardShortcut(keyEvent('N', { target: search }))).toBeNull()

    const text = document.createElement('input')
    text.type = 'text'
    expect(resolveDashboardShortcut(keyEvent('n', { target: text }))).toBeNull()

    const textarea = document.createElement('textarea')
    expect(resolveDashboardShortcut(keyEvent('/', { target: textarea }))).toBeNull()

    const select = document.createElement('select')
    expect(resolveDashboardShortcut(keyEvent('n', { target: select }))).toBeNull()

    const editable = document.createElement('div')
    editable.contentEditable = 'true'
    expect(resolveDashboardShortcut(keyEvent('n', { target: editable }))).toBeNull()
  })

  it('still fires from button-like inputs', () => {
    for (const type of ['button', 'checkbox', 'radio', 'submit'] as const) {
      const input = document.createElement('input')
      input.type = type
      expect(resolveDashboardShortcut(keyEvent('n', { target: input }))).toBe('new-entry')
    }
  })
})
