import { describe, expect, it } from 'vitest'
import { hasActualOffLocal } from '../fetch.post'

describe('FCV fetch scheduled filtering', () => {
  it('treats flights with actual_off_local as departed', () => {
    expect(hasActualOffLocal({ actual_off_local: '2026-04-08 17:05:00' })).toBe(true)
  })

  it('treats missing or empty actual_off_local as scheduled/not departed', () => {
    expect(hasActualOffLocal({ actual_off_local: '' })).toBe(false)
    expect(hasActualOffLocal({ actual_off_local: '   ' })).toBe(false)
    expect(hasActualOffLocal({ actual_off_local: undefined })).toBe(false)
  })
})
