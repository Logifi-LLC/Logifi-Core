/**
 * When dashboard OOOI watchers may overwrite total/pic/sic (and then XC /
 * categoryClassTime). Opening or hydrating an existing entry must not rewrite
 * stored times: only a real change to Out/Off/On/In clocks may auto-fill.
 *
 * Snapshot comparison (same idea as nightAutoCalcPolicy) is used instead of a
 * hydration flag because the watchers are async (airport timezone lookup). A
 * flag can clear before the write; the loaded OOOI clock snapshot is still
 * valid at write time.
 */

export interface OooiClockInputs {
  out?: string | null
  off?: string | null
  on?: string | null
  in?: string | null
}

/** Role-distributed flight-time fields the OOOI watchers may write. */
export interface OooiDerivedFlightTime {
  total: number | null
  pic: number | null
  sic: number | null
  dual: number | null
  solo: number | null
}

export function oooiClockInputKey(inputs: OooiClockInputs): string {
  return [
    inputs.out ?? '',
    inputs.off ?? '',
    inputs.on ?? '',
    inputs.in ?? '',
  ].join('|')
}

export function shouldApplyOooiDerivedTimes(opts: {
  /** Out/Off/On/In still match the snapshot taken when the form opened. */
  inputsUnchangedFromOpen: boolean
  /** Out/Off/On/In did not change from the previous watcher tick (role/date/airports only). */
  oooiClocksUnchangedFromPrevious: boolean
}): boolean {
  if (opts.inputsUnchangedFromOpen) return false
  if (opts.oooiClocksUnchangedFromPrevious) return false
  return true
}

/**
 * Auto-fill total and role columns from a computed OOOI block/air time.
 * Matches the dashboard watchers: PIC/SIC overwrite the other seat; Dual
 * Received only fills dual; Solo fills solo and PIC.
 */
export function applyOooiDerivedFlightTimes(
  flightTime: OooiDerivedFlightTime,
  role: string | null | undefined,
  blockHours: number
): void {
  flightTime.total = blockHours
  if (role === 'PIC') {
    flightTime.pic = blockHours
    flightTime.sic = null
  } else if (role === 'SIC') {
    flightTime.sic = blockHours
    flightTime.pic = null
  } else if (role === 'Dual Received') {
    flightTime.dual = blockHours
  } else if (role === 'Solo') {
    flightTime.solo = blockHours
    flightTime.pic = blockHours
  }
}
