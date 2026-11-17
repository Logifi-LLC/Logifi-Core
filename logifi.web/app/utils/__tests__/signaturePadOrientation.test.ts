import { describe, expect, it } from 'vitest'
import {
  dominantOrientationAngle,
  orientationCorrectionDegrees,
} from '../signaturePadOrientation'

describe('signaturePadOrientation', () => {
  it('picks the dominant angle from stroke samples', () => {
    expect(dominantOrientationAngle([0, 90, 90, 90, 0])).toBe(90)
    expect(dominantOrientationAngle([270, 270, 90])).toBe(270)
  })

  it('maps capture angle to portrait-up correction', () => {
    expect(orientationCorrectionDegrees(90)).toBe(270)
    expect(orientationCorrectionDegrees(270)).toBe(90)
    expect(orientationCorrectionDegrees(0)).toBe(0)
  })
})