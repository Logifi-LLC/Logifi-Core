import { describe, expect, it } from 'vitest'
import {
  flicaHtmlToText,
  filterAirlineLegs,
  filterAirlineLegsWithStats,
  parseFlicaSchedule,
} from '../flicaParse'

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

/** Ground-truth trip from live RJET schedule (Aug 12, 2026). */
const L7G13_FIXTURE = `
August Schedule
DEREK FARMER
(624619)
Last Updated Aug 12, 2026 09:51:14 EDT
L7G13 : 12AUG  ONLY ON WED  BSE REPT: 1019L
Operates: Aug 12 Only
Base/Equip: LGA/EM7 CA01
WE 12  4442 LGA-RIC 1059 1226 0127 0044 A21
WE 12  4442 RIC-LGA 1310 1426 0116 A21
D-END: 1441L
Total: 0243 0000 0412 0422/0407
Crew:
CA 624619 FARMER, DEREK
`

const L7G13_HTML_FIXTURE = `
<html><body>
<div>L7G13 : 12AUG ONLY ON WED BSE REPT: 1019L</div>
<div>Base/Equip: LGA/EM7 CA01</div>
<table>
<tr><td>WE</td><td>12</td><td></td><td></td><td>4442</td><td>LGA-RIC</td><td>1059</td><td>1226</td><td>0127</td></tr>
<tr><td>WE</td><td>12</td><td></td><td></td><td>4442</td><td>RIC-LGA</td><td>1310</td><td>1426</td><td>0116</td></tr>
</table>
<br>Crew:<br>
CA 624619 FARMER, DEREK
</body></html>
`

/** Classic FLICA CGI: ISO-8859-1, omitted </tr></td>, &nbsp; padding, FONT wrappers. */
const L7G13_FLICA_CGI_HTML = `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN">
<html>
<head><meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">
<title>Schedule Detail</title></head>
<body>
<table border=0 cellpadding=0 cellspacing=0>
<tr><td colspan=12><font size=2><b>L7G13 : 12AUG&nbsp;&nbsp;ONLY ON WED&nbsp;&nbsp;BSE REPT: 1019L</b></font>
<tr><td colspan=12><font size=2>Base/Equip: LGA/EM7 CA01</font>
<tr>
<td><font size=2>WE</font>
<td><font size=2>12</font>
<td><font size=2>&nbsp;</font>
<td><font size=2>4442</font>
<td><font size=2>LGA-RIC</font>
<td><font size=2>1059</font>
<td><font size=2>1226</font>
<td><font size=2>0127</font>
<tr>
<td><font size=2>WE</font>
<td><font size=2>12</font>
<td><font size=2>&nbsp;</font>
<td><font size=2>4442</font>
<td><font size=2>RIC-LGA</font>
<td><font size=2>1310</font>
<td><font size=2>1426</font>
<td><font size=2>0116</font>
<tr><td colspan=12>Crew:
<tr><td colspan=12>CA 624619 FARMER, DEREK
</table>
</body></html>
`

const L7G13_SPLIT_ROUTE_HTML = `
<div>L7G13 : 12AUG</div>
<div>Base/Equip: LGA/EM7</div>
<table>
<tr><td>WE</td><td>12</td><td>&nbsp;</td><td>4442</td><td>LGA</td><td>RIC</td><td>1059</td><td>1226</td><td>0127</td></tr>
<tr><td>WE</td><td>12</td><td>&nbsp;</td><td>4442</td><td>RIC</td><td>LGA</td><td>1310</td><td>1426</td><td>0116</td></tr>
</table>
`

function expectL7G13Turn(legs: ReturnType<typeof parseFlicaSchedule>) {
  expect(legs).toHaveLength(2)
  expect(legs.map((l) => l.external_flight_id)).toEqual([
    'FLICA_20260812_4442_LGA',
    'FLICA_20260812_4442_RIC',
  ])
  expect(legs[0].trip_number).toBe('L7G13')
  expect(legs[0].dep_airport).toBe('LGA')
  expect(legs[0].arr_airport).toBe('RIC')
  expect(legs[0].is_deadhead).toBe(false)
  expect(legs[0].scheduled_out_local).toBe('2026-08-12 10:59:00')
  expect(legs[1].dep_airport).toBe('RIC')
  expect(legs[1].arr_airport).toBe('LGA')
  expect(legs[1].scheduled_out_local).toBe('2026-08-12 13:10:00')
}

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

  it('maps FO crew slot to SIC when the schedule belongs to the first officer', () => {
    const text = `
August Schedule
DREW SUTTON
(627385)
Last Updated Aug 12, 2026 09:51:14 EDT
L7513 : 04AUG  EXCEPT SUN SAT  BSE REPT: 0520L
Base/Equip: LGA/EM7 CA01FO01
TU 04  5772 DCA-LGA0812 0953 0141 0029 8879
Crew:
CA 624619 FARMER, DEREK FO 627385 SUTTON, DREW
`
    const legs = parseFlicaSchedule(text)
    expect(legs[0]?.role).toBe('SIC')
    expect(legs[0]?.crew.some((c) => c.position === 'FO' && c.employeeId === '627385')).toBe(true)
  })

  it('parses FO-first crew lines and still matches SIC', () => {
    const text = `
August Schedule
DREW SUTTON
(627385)
L7513 : 04AUG
Base/Equip: LGA/EM7
TU 04  5772 DCA-LGA0812 0953 0141
Crew:
FO 627385 SUTTON, DREW CA 624619 FARMER, DEREK
`
    const legs = parseFlicaSchedule(text, { defaultYear: 2026 })
    expect(legs[0]?.role).toBe('SIC')
    expect(legs[0]?.crew.map((c) => c.position)).toEqual(['FO', 'CA'])
  })

  it('parses FO-only crew lines as SIC for that employee', () => {
    const text = `
August Schedule
DREW SUTTON
(627385)
L7513 : 04AUG
TU 04  5772 DCA-LGA0812 0953 0141
Crew:
FO 627385 SUTTON, DREW
`
    const legs = parseFlicaSchedule(text, { defaultYear: 2026 })
    expect(legs[0]?.role).toBe('SIC')
    expect(legs[0]?.crew).toEqual([
      { position: 'FO', name: 'SUTTON, DREW', employeeId: '627385' },
    ])
  })

  it('leaves role empty when there is no crew line', () => {
    const text = `
L7G13 : 12AUG
Base/Equip: LGA/EM7 CA01
WE 12  4442 LGA-RIC 1059 1226 0127
`
    const legs = parseFlicaSchedule(text, { defaultYear: 2026 })
    expect(legs[0]?.role).toBe('')
    expect(legs[0]?.crew).toEqual([])
  })

  it('leaves role empty when the header pilot is not on the crew line', () => {
    const text = `
August Schedule
DEREK FARMER
(624619)
L7513 : 04AUG
TU 04  5772 DCA-LGA0812 0953 0141
Crew:
CA 111111 OTHER, PILOT FO 222222 SOMEONE, ELSE
`
    const legs = parseFlicaSchedule(text, { defaultYear: 2026 })
    expect(legs[0]?.role).toBe('')
    expect(legs[0]?.crew).toHaveLength(2)
  })

  it('parses L7G13 Aug 12 turn (4442 LGA-RIC / RIC-LGA)', () => {
    expectL7G13Turn(parseFlicaSchedule(L7G13_FIXTURE))
  })

  it('parses L7G13 from table HTML with cell breaks', () => {
    expectL7G13Turn(parseFlicaSchedule(L7G13_HTML_FIXTURE, { defaultYear: 2026 }))
  })

  it('parses L7G13 from classic FLICA CGI (unclosed tags + &nbsp;)', () => {
    const text = flicaHtmlToText(L7G13_FLICA_CGI_HTML)
    expect(text).toMatch(/WE\s+12\s+4442\s+LGA-RIC/)
    expectL7G13Turn(parseFlicaSchedule(L7G13_FLICA_CGI_HTML, { defaultYear: 2026 }))
  })

  it('parses L7G13 when DPS and ARS are separate table cells', () => {
    expectL7G13Turn(parseFlicaSchedule(L7G13_SPLIT_ROUTE_HTML, { defaultYear: 2026 }))
  })

  it('uses defaultYear when Last Updated year is missing', () => {
    const text = `
L7G13 : 12AUG
Base/Equip: LGA/EM7 CA01
WE 12  4442 LGA-RIC 1059 1226 0127
`
    const legs = parseFlicaSchedule(text, { defaultYear: 2026 })
    expect(legs[0]?.scheduled_out_local?.startsWith('2026-08-12')).toBe(true)
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

  it('reports exclusion counts', () => {
    const stats = filterAirlineLegsWithStats(legs, {
      includeDeadheads: false,
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    })
    expect(stats.excludedDeadheads).toBeGreaterThan(0)
    expect(stats.filtered.every((l) => !l.is_deadhead)).toBe(true)
    expect(stats.filtered.length + stats.excludedDeadheads).toBe(legs.length)
  })
})
