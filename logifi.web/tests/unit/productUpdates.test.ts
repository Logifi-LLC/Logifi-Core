import { describe, expect, it } from 'vitest'
import { isUpdateDismissed } from '~/composables/useProductUpdates'

describe('isUpdateDismissed', () => {
  it('returns true when dismissed id matches update id', () => {
    expect(isUpdateDismissed('2026-06-digifi', '2026-06-digifi')).toBe(true)
  })

  it('returns false when dismissed id differs or is null', () => {
    expect(isUpdateDismissed('2026-06-digifi', '2026-05-add-pages')).toBe(false)
    expect(isUpdateDismissed('2026-06-digifi', null)).toBe(false)
  })
})

describe('formatProductUpdateDate', () => {
  it('formats ISO date for display', async () => {
    const { formatProductUpdateDate } = await import('~/data/productUpdates')
    const formatted = formatProductUpdateDate('2026-06-03')
    expect(formatted).toContain('2026')
    expect(formatted).toContain('June')
  })
})
