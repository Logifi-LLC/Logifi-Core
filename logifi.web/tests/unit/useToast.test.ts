import { afterEach, describe, expect, it, vi } from 'vitest'
import { useToast } from '../../app/composables/useToast'

describe('useToast', () => {
  afterEach(() => {
    useToast().dismissToast()
    vi.useRealTimers()
  })

  it('stores a message with the default info type', () => {
    const { showToast, toastMessage, toastType } = useToast()
    showToast('Hello')
    expect(toastMessage.value).toBe('Hello')
    expect(toastType.value).toBe('info')
  })

  it('accepts a duration number as the second argument', () => {
    vi.useFakeTimers()
    const { showToast, toastMessage, dismissToast } = useToast()
    showToast('Timed', 1000)
    expect(toastMessage.value).toBe('Timed')
    vi.advanceTimersByTime(1000)
    expect(toastMessage.value).toBeNull()
    dismissToast()
  })

  it('accepts typed options for success and error', () => {
    const { showToast, toastMessage, toastType } = useToast()
    showToast('Saved', { type: 'success' })
    expect(toastMessage.value).toBe('Saved')
    expect(toastType.value).toBe('success')

    showToast('Nope', { type: 'error', duration: 2000 })
    expect(toastMessage.value).toBe('Nope')
    expect(toastType.value).toBe('error')
  })

  it('dismisses the current toast immediately', () => {
    const { showToast, toastMessage, dismissToast } = useToast()
    showToast('Stay')
    dismissToast()
    expect(toastMessage.value).toBeNull()
  })
})
