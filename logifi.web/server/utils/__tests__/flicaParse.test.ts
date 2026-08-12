import { describe, expect, it } from 'vitest'
import { filterAirlineLegs, parseFlicaSchedule } from '../flicaParse'

const FLICA_FIXTURE = `
August Schedule
DEREK FARMER
(624619)
Last Updated Aug 12, 2026 09:51:14 EDT
L7513 : 04AUG  EXCEPT SUN SAT  BSE REPT: 0520L
Base/Equip: LGA/EM7 CA01FO01
TU 04 * 5770 LGA-DCA0605 0712 0107 0100 8823
TU 04  5772 DCA-LGA0812 0953 0141 0029 8879
Crew:
CA 624619 FARMER, DEREK FO 627385 SUTTON, DREW
L7528 : 06AUG  TUE-THU  BSE REPT: 0635L
Base/Equip: LGA/EM7 CA01
TH 06 * 5686 LGA-CMH 0734 0921 0147 0334 8210
Crew:
CA 624619 FARMER, DEREK
GDO : 01AUG
ActivityStart DateStart TimeEnd DateEnd TimeCredit
GDO 01AUG 02:00 03AUG 23:59 0000
`

describe('parseFlicaSchedule', () => {
  it('parses trip legs and skips GDO blocks', () => {
    const legs = parseFlicaSchedule(FLICA_FIXTURE)
    expect(legs.length).toBeGreaterThanOrEqual(3)

    const deadhead = legs.find((l) => l.flight_number === '5770')
    expect(deadhead).toBeDefined()
    expect(deadhead?.is_deadhead).toBe(true)
    expect(deadhead?.dep_airport).toBe('LGA')
    expect(deadhead?.arr_airport).toBe('DCA')
    expect(deadhead?.external_flight_id).toBe('FLICA_20260804_5770_LGA')
    expect(deadhead?.import_source).toBe('flica_aerodatabox')
    expect(deadhead?.scheduled_out_local).toBe('2026-08-04 06:05:00')
    expect(deadhead?.scheduled_in_local).toBe('2026-08-04 07:12:00')
    expect(deadhead?.block_minutes).toBe(67)
    expect(deadhead?.fcv_aircraft_type).toBe('EM7')
    expect(deadhead?.role).toBe('PIC')
    expect(deadhead?.crew.some((c) => c.name.includes('SUTTON'))).toBe(true)

    const operating = legs.find((l) => l.flight_number === '5772')
    expect(operating?.is_deadhead).toBe(false)
    expect(operating?.scheduled_out_local).toBe('2026-08-04 08:12:00')

    expect(legs.some((l) => l.flight_number === '5686')).toBe(true)
    expect(legs.some((l) => l.flight_number.startsWith('GDO'))).toBe(false)
  })
})

describe('filterAirlineLegs', () => {
  const legs = parseFlicaSchedule(FLICA_FIXTURE)

  it('filters deadheads when includeDeadheads is false', () => {
    const filtered = filterAirlineLegs(legs, { includeDeadheads: false })
    expect(filtered.every((l) => !l.is_deadhead)).toBe(true)
  })

  it('filters by date range', () => {
    const filtered = filterAirlineLegs(legs, {
      dateFrom: '2026-08-04',
      dateTo: '2026-08-04',
      includeDeadheads: true,
    })
    expect(filtered.every((l) => l.scheduled_out_local?.startsWith('2026-08-04'))).toBe(true)
  })
})
