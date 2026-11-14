import { describe, expect, it } from 'vitest'
import { cooldownEndsAt, remainingCooldownSeconds } from '../resendCooldown'

describe('resendCooldown', () => {
  it('counts down remaining seconds', () => {
    expect(remainingCooldownSeconds(61_000, 0)).toBe(61)
    expect(remainingCooldownSeconds(30_000, 20_000)).toBe(10)
    expect(remainingCooldownSeconds(10_000, 10_000)).toBe(0)
    expect(remainingCooldownSeconds(null, 0)).toBe(0)
  })

  it('builds cooldown end timestamps', () => {
    expect(cooldownEndsAt(1_000, 60)).toBe(61_000)
  })
})
