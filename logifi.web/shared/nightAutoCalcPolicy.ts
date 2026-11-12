/**
 * When the dashboard may write auto-calculated night into the entry form.
 * No schema field: uses form-touched state plus a snapshot of OOOI inputs
 * taken when inline edit opens, so opening an entry does not overwrite a
 * stored (including user-typed) night value.
 */

export interface NightAutoCalcInputs {
  date?: string | null
  departure?: string | null
  destination?: string | null
  out?: string | null
  in?: string | null
  isZulu?: boolean | null
}

export function nightAutoCalcInputKey(inputs: NightAutoCalcInputs): string {
  return [
    inputs.date ?? '',
    inputs.departure ?? '',
    inputs.destination ?? '',
    inputs.out ?? '',
    inputs.in ?? '',
    inputs.isZulu === false ? 'L' : 'Z',
  ].join('|')
}

export function shouldApplyAutoNightTime(opts: {
  /** User typed/cleared the night field this session. */
  nightFieldTouched: boolean
  /** OOOI/date/airports/isZulu still match the snapshot from opening the form. */
  inputsUnchangedFromOpen: boolean
}): boolean {
  if (opts.nightFieldTouched) return false
  if (opts.inputsUnchangedFromOpen) return false
  return true
}
