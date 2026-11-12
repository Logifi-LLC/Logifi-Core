import { describe, expect, it } from 'vitest'
import {
  nightAutoCalcInputKey,
  shouldApplyAutoNightTime,
} from '../nightAutoCalcPolicy'

describe('nightAutoCalcPolicy', () => {
  const openInputs = {
    date: '2026-11-12',
    departure: 'KLAX',
    destination: 'KLAX',
    out: '1600',
    in: '1645',
    isZulu: false,
  }

  it('does not overwrite night when inline edit opens with unchanged OOOI (manual value preserved)', () => {
    const baseline = nightAutoCalcInputKey(openInputs)
    const current = nightAutoCalcInputKey(openInputs)
    expect(
      shouldApplyAutoNightTime({
        nightFieldTouched: false,
        inputsUnchangedFromOpen: current === baseline,
      })
    ).toBe(false)
  })

  it('does not overwrite night after the user types a night value', () => {
    expect(
      shouldApplyAutoNightTime({
        nightFieldTouched: true,
        inputsUnchangedFromOpen: false,
      })
    ).toBe(false)
  })

  it('recalculates when OOOI changes and the user has not typed night', () => {
    const baseline = nightAutoCalcInputKey(openInputs)
    const current = nightAutoCalcInputKey({ ...openInputs, out: '1700' })
    expect(
      shouldApplyAutoNightTime({
        nightFieldTouched: false,
        inputsUnchangedFromOpen: current === baseline,
      })
    ).toBe(true)
  })

  it('still blocks after OOOI changes if the user already typed night', () => {
    const baseline = nightAutoCalcInputKey(openInputs)
    const current = nightAutoCalcInputKey({ ...openInputs, out: '1700' })
    expect(
      shouldApplyAutoNightTime({
        nightFieldTouched: true,
        inputsUnchangedFromOpen: current === baseline,
      })
    ).toBe(false)
  })
})
