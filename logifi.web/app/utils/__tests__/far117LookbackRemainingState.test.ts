import { describe, expect, it } from 'vitest'
import {
  far117LookbackRemainingState,
  far117LookbackStateAriaPhrase,
} from '../far117LookbackRemainingState'

describe('far117LookbackRemainingState', () => {
  const limit100 = 100
  const limit1000 = 1000

  it('is normal above 20% remaining', () => {
    expect(far117LookbackRemainingState(21, limit100, 79)).toBe('normal')
    expect(far117LookbackRemainingState(201, limit1000, 799)).toBe('normal')
  })

  it('is near_limit at exactly 20% remaining', () => {
    expect(far117LookbackRemainingState(20, limit100, 80)).toBe('near_limit')
    expect(far117LookbackRemainingState(200, limit1000, 800)).toBe('near_limit')
  })

  it('is critical at exactly 5% remaining', () => {
    expect(far117LookbackRemainingState(5, limit100, 95)).toBe('critical')
    expect(far117LookbackRemainingState(50, limit1000, 950)).toBe('critical')
  })

  it('is over_limit when used exceeds the limit', () => {
    expect(far117LookbackRemainingState(0, limit100, 100.1)).toBe('over_limit')
    expect(far117LookbackRemainingState(0, limit1000, 1001)).toBe('over_limit')
  })
})

describe('far117LookbackStateAriaPhrase', () => {
  it('maps states for non-color accessibility', () => {
    expect(far117LookbackStateAriaPhrase('normal')).toBe('within limit')
    expect(far117LookbackStateAriaPhrase('near_limit')).toBe('near limit')
    expect(far117LookbackStateAriaPhrase('critical')).toBe('very near limit')
    expect(far117LookbackStateAriaPhrase('over_limit')).toBe('over limit')
  })
})