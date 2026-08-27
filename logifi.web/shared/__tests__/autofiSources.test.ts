import { describe, expect, it } from 'vitest'
import {
  buildAutofiSourceTrace,
  clockFromLocalDatetime,
  emptyAeroEnricherSnapshot,
  snapshotFlicaSource,
} from '../autofiSources'

describe('clockFromLocalDatetime', () => {
  it('formats a FLICA local datetime as HH:MM', () => {
    expect(clockFromLocalDatetime('2026-08-27 06:03:00')).toBe('06:03')
  })

  it('returns null for empty input', () => {
    expect(clockFromLocalDatetime(null)).toBeNull()
    expect(clockFromLocalDatetime('')).toBeNull()
  })
})

describe('snapshotFlicaSource', () => {
  it('reads FLICA Out/In and leaves Off/On empty when Aero has not run', () => {
    const snap = snapshotFlicaSource({
      scheduled_out_local: '2026-08-27 06:03:00',
      scheduled_in_local: '2026-08-27 07:10:00',
      actual_off_local: null,
      actual_on_local: null,
      fcv_tail_number: '',
      fcv_aircraft_type: 'E75',
      block_minutes: 67,
    })
    expect(snap.out).toBe('06:03')
    expect(snap.in).toBe('07:10')
    expect(snap.off).toBeNull()
    expect(snap.on).toBeNull()
    expect(snap.blockMinutes).toBe(67)
  })
})

describe('buildAutofiSourceTrace', () => {
  it('keeps FLICA clocks separate from unused Aero gate times', () => {
    const trace = buildAutofiSourceTrace(
      snapshotFlicaSource({
        scheduled_out_local: '2026-08-27 06:03:00',
        scheduled_in_local: '2026-08-27 07:10:00',
        actual_off_local: null,
        actual_on_local: null,
        fcv_tail_number: '',
        fcv_aircraft_type: '',
        block_minutes: 67,
      }),
      emptyAeroEnricherSnapshot({
        configured: true,
        attempted: true,
        hit: true,
        unusedOut: '07:27',
        unusedIn: '08:30',
        off: '06:14',
        on: '07:20',
        tail: 'N421YX',
      })
    )
    expect(trace.flica.out).toBe('06:03')
    expect(trace.enricher.unusedOut).toBe('07:27')
    expect(trace.enricher.off).toBe('06:14')
    expect(trace.enricher.tail).toBe('N421YX')
  })
})
