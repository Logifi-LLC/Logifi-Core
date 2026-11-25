import { describe, expect, it } from 'vitest'
import {
  ATP_SHARED_EXPERIENCE_REQUIREMENTS,
  ATP_TOTAL_BY_TRACK,
  requirementsForAtpTrack,
} from '../atpRequirements'

describe('atpRequirements', () => {
  it('ATP total is 1500; R-ATP only changes total', () => {
    expect(ATP_TOTAL_BY_TRACK.atp.requiredHours).toBe(1500)
    expect(ATP_TOTAL_BY_TRACK.ratp_1000.requiredHours).toBe(1000)
    expect(ATP_TOTAL_BY_TRACK.ratp_1250.requiredHours).toBe(1250)

    const atp = requirementsForAtpTrack('atp')
    const r1000 = requirementsForAtpTrack('ratp_1000')
    const r1250 = requirementsForAtpTrack('ratp_1250')

    expect(atp.find((r) => r.key === 'crossCountry')?.requiredHours).toBe(500)
    expect(r1000.find((r) => r.key === 'crossCountry')?.requiredHours).toBe(500)
    expect(r1250.find((r) => r.key === 'crossCountry')?.requiredHours).toBe(500)
  })

  it('shared 61.159 experience minimums', () => {
    const byKey = Object.fromEntries(
      ATP_SHARED_EXPERIENCE_REQUIREMENTS.map((r) => [r.key, r.requiredHours])
    )
    expect(byKey.crossCountry).toBe(500)
    expect(byKey.night).toBe(100)
    expect(byKey.multiEngine).toBe(50)
    expect(byKey.instrument).toBe(75)
    expect(byKey.pic).toBe(250)
    expect(byKey.picCrossCountry).toBe(100)
    expect(byKey.picNight).toBe(25)
  })
})