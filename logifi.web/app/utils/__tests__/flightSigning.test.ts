import { describe, expect, it } from 'vitest'
import { requiresInstructorSignature } from '../flightSigning'
import type { FlightTimeBreakdown } from '../logbookTypes'

const dualTime = (dual: number): FlightTimeBreakdown =>
  ({
    dual,
    total: dual,
  }) as FlightTimeBreakdown

describe('requiresInstructorSignature', () => {
  it('requires signature when dual received > 0', () => {
    expect(requiresInstructorSignature({ flightTime: dualTime(1.2) })).toBe(true)
  })

  it('does not require signature when dual is 0', () => {
    expect(requiresInstructorSignature({ flightTime: dualTime(0) })).toBe(false)
  })

  it('skips signing for imported entries even with dual time', () => {
    expect(
      requiresInstructorSignature({ flightTime: dualTime(2), isImported: true })
    ).toBe(false)
  })

  it('skips signing for void amendments', () => {
    expect(
      requiresInstructorSignature({ flightTime: dualTime(2), isVoid: true })
    ).toBe(false)
  })
})
