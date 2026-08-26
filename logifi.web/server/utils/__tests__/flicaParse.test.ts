import { describe, expect, it } from 'vitest'
import { DateTime } from 'luxon'
import {
  flicaHtmlToText,
  filterAirlineLegs,
  filterAirlineLegsWithStats,
  overlayFlicaPairingLegs,
  parseFlicaLastUpdatedMs,
  parseFlicaSchedule,
  pickFlicaGateHhmm,
} from '../flicaParse'

const FLICA_FIXTURE = `
August Schedule
DEREK FARMER
(624619)
Last Updated Aug 12, 2026 09:51:14 EDT
L7513 : 04AUG  EXCEPT SUN SAT  BSE REPT: 0520L
Base/Equip: LGA/EM7 CA01FO01
TU	04	*		5770	LGA-DCA	0605	0712	0107	0100	8823
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

/** Live 3-day pairing (Aug 18–20, 2026): C * is AC swap, crew once at the end. */
const THREE_DAY_PAIRING_TSV = `
August Schedule
DEREK FARMER
(624619)
Last Updated Aug 18, 2026 09:00:00 EDT
L7H18 : 18AUG  TUE-THU  BSE REPT: 0515L
Base/Equip: LGA/EM7 CA01FO01
DY	DD	DH	C	FLTNO	DPS-ARS	DEPL	ARRL	BLKT	GRNT	OA	    	TBLK	TDHD	 	TCRD	TDUTY/FDP	LAYOVER
TU	18	 	*	4393	LGA-DCA	0603	0727	 0124	0108	121
TU	18	 	 	4776	DCA-STL	0835	0957	 0222	 	111	 	0346	        	        	0412	0552/0537	STL 1903
 	D-END: 1012L REPT: 0515L	SHERATON WESTPORT CHALET	(314)878-1500
WE	19	 	*	4669	STL-LGA	0600	0929	 0229	0221	A16
WE	19	 	 	4349	LGA-ATL	1150	1430	 0240	 	C57	 	0509	        	        	0509	0830/0815	ATL 1439
 	D-END: 1445L REPT: 0524L	DRURY INN & SUITES ATLANT	(404)761-4900
TH	20	 	 	4809	ATL-LGA	0609	0825	 0216	0047	B48
TH	20	 	 	4584	LGA-RIC	0912	1047	 0135	0030	B48
TH	20	 	 	4584	RIC-LGA	1117	1239	 0122	 	B48	 	0513	        	        	0513	0730/0715
 	D-END: 1254L    T.A.F.B.: 5534
 	Total: 	1408	0000	 	1434	2152/2107
Crew:
    	CA 	 624619	  FARMER, DEREK 	    	FO 	 626955	  JOHNS, LUKE
`

const THREE_DAY_SPLIT_CREW_HTML = `
<html><body>
<div>DEREK FARMER (624619)</div>
<div>L7H18 : 18AUG</div>
<div>Base/Equip: LGA/EM7 CA01FO01</div>
<table>
<tr><td>TU</td><td>18</td><td></td><td>*</td><td>4393</td><td>LGA-DCA</td><td>0603</td><td>0727</td><td>0124</td></tr>
<tr><td>TU</td><td>18</td><td></td><td></td><td>4776</td><td>DCA-STL</td><td>0835</td><td>0957</td><td>0222</td></tr>
<tr><td colspan=12>D-END: 1012L SHERATON WESTPORT CHALET</td></tr>
<tr><td>WE</td><td>19</td><td></td><td>*</td><td>4669</td><td>STL-LGA</td><td>0600</td><td>0929</td><td>0229</td></tr>
<tr><td>WE</td><td>19</td><td></td><td></td><td>4349</td><td>LGA-ATL</td><td>1150</td><td>1430</td><td>0240</td></tr>
<tr><td>TH</td><td>20</td><td></td><td></td><td>4809</td><td>ATL-LGA</td><td>0609</td><td>0825</td><td>0216</td></tr>
<tr><td>TH</td><td>20</td><td></td><td></td><td>4584</td><td>LGA-RIC</td><td>0912</td><td>1047</td><td>0135</td></tr>
<tr><td>TH</td><td>20</td><td></td><td></td><td>4584</td><td>RIC-LGA</td><td>1117</td><td>1239</td><td>0122</td></tr>
<tr><td colspan=12>Total: 1408</td></tr>
<tr><td colspan=12>Crew:</td></tr>
<tr><td>CA</td><td>624619</td><td>FARMER, DEREK</td></tr>
<tr><td>FO</td><td>626955</td><td>JOHNS, LUKE</td></tr>
</table>
</body></html>
`

const THREE_DAY_IDS = [
  'FLICA_20260818_4393_LGA',
  'FLICA_20260818_4776_DCA',
  'FLICA_20260819_4669_STL',
  'FLICA_20260819_4349_LGA',
  'FLICA_20260820_4809_ATL',
  'FLICA_20260820_4584_LGA',
  'FLICA_20260820_4584_RIC',
]

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

function expectThreeDayPairing(legs: ReturnType<typeof parseFlicaSchedule>) {
  expect(legs).toHaveLength(7)
  expect(legs.map((l) => l.external_flight_id)).toEqual(THREE_DAY_IDS)
  expect(legs.every((l) => l.is_deadhead === false)).toBe(true)
  expect(legs.every((l) => l.trip_number === 'L7H18')).toBe(true)
  expect(legs.every((l) => l.role === 'PIC')).toBe(true)
  expect(legs[0]?.crew.map((c) => c.employeeId)).toEqual(['624619', '626955'])
  expect(legs[6]?.crew.some((c) => c.name.includes('JOHNS'))).toBe(true)
  expect(legs.find((l) => l.flight_number === '4393')?.scheduled_out_local).toBe(
    '2026-08-18 06:03:00'
  )
  expect(legs.find((l) => l.flight_number === '4669')?.dep_airport).toBe('STL')
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

    const acSwap = legs.find((l) => l.flight_number === '5686')
    expect(acSwap?.is_deadhead).toBe(false)
    expect(acSwap?.role).toBe('PIC')

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

  it('infers PIC from CA-only Base/Equip when there is no crew line', () => {
    const text = `
L7G13 : 12AUG
Base/Equip: LGA/EM7 CA01
WE 12  4442 LGA-RIC 1059 1226 0127
`
    const legs = parseFlicaSchedule(text, { defaultYear: 2026 })
    expect(legs[0]?.role).toBe('PIC')
    expect(legs[0]?.crew).toEqual([])
  })

  it('infers SIC from FO-only Base/Equip when there is no crew line', () => {
    const text = `
L7G13 : 12AUG
Base/Equip: LGA/EM7 FO01
WE 12  4442 LGA-RIC 1059 1226 0127
`
    const legs = parseFlicaSchedule(text, { defaultYear: 2026 })
    expect(legs[0]?.role).toBe('SIC')
    expect(legs[0]?.crew).toEqual([])
  })

  it('leaves role empty when Base/Equip lists both seats and there is no crew line', () => {
    const text = `
L7G13 : 12AUG
Base/Equip: LGA/EM7 CA01FO01
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
    expect(text).toMatch(/WE[\s|]+12[\s|]+4442[\s|]+LGA-RIC/)
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

  it('parses a 3-day pairing with AC-swap stars and crew at the end', () => {
    expectThreeDayPairing(parseFlicaSchedule(THREE_DAY_PAIRING_TSV, { defaultYear: 2026 }))
  })

  it('merges CA and FO when crew is split across table rows after D-END/Total', () => {
    expectThreeDayPairing(parseFlicaSchedule(THREE_DAY_SPLIT_CREW_HTML, { defaultYear: 2026 }))
  })

  it('parses every trip in a month dump regardless of pairing length', () => {
    const text = `
August Schedule
DEREK FARMER
(624619)
Last Updated Aug 18, 2026 09:00:00 EDT
L1A01 : 03AUG
Base/Equip: LGA/EM7 CA01
MO 03  1001 LGA-BOS 0800 0910 0110
Crew:
CA 624619 FARMER, DEREK
L5B05 : 10AUG
Base/Equip: LGA/EM7 CA01FO01
MO 10  2001 LGA-ORD 0700 0900 0200
TU 11  2002 ORD-DFW 1000 1200 0200
WE 12  2003 DFW-ORD 1300 1500 0200
TH 13  2004 ORD-LGA 1600 1900 0300
FR 14  2005 LGA-DCA 2000 2100 0100
D-END: 2115L
Crew:
CA 624619 FARMER, DEREK FO 626955 JOHNS, LUKE
L6C06 : 20AUG
Base/Equip: LGA/EM7 CA01
TH 20  3001 LGA-CLT 0600 0800 0200
FR 21  3002 CLT-MIA 0900 1100 0200
SA 22  3003 MIA-CLT 1200 1400 0200
SU 23  3004 CLT-ATL 1500 1600 0100
MO 24  3005 ATL-CLT 1700 1800 0100
TU 25  3006 CLT-LGA 1900 2100 0200
Crew:
CA 624619 FARMER, DEREK
`
    const legs = parseFlicaSchedule(text, { defaultYear: 2026 })
    expect(legs).toHaveLength(12)
    expect(legs.filter((l) => l.trip_number === 'L1A01')).toHaveLength(1)
    expect(legs.filter((l) => l.trip_number === 'L5B05')).toHaveLength(5)
    expect(legs.filter((l) => l.trip_number === 'L6C06')).toHaveLength(6)
    expect(legs.every((l) => l.role === 'PIC')).toBe(true)
    expect(legs.find((l) => l.trip_number === 'L5B05')?.crew.some((c) => c.name.includes('JOHNS'))).toBe(
      true
    )
    expect(legs.find((l) => l.trip_number === 'L1A01')?.crew.some((c) => c.name.includes('JOHNS'))).toBe(
      false
    )
    expect(legs.find((l) => l.flight_number === '3006')?.scheduled_out_local).toBe(
      '2026-08-25 19:00:00'
    )
  })

  it('rolls a pairing into the next month when IROPS / days-off add legs past month-end', () => {
    const text = `
August Schedule
DEREK FARMER
(624619)
Last Updated Aug 30, 2026 09:00:00 EDT
L9Z30 : 30AUG
Base/Equip: LGA/EM7 CA01
SU 30  4001 LGA-STL 0800 1000 0200
MO 31  4002 STL-DEN 1100 1300 0200
TU 01  4003 DEN-STL 0600 0900 0300
WE 02  4004 STL-LGA 1000 1400 0400
Crew:
CA 624619 FARMER, DEREK
`
    const legs = parseFlicaSchedule(text, { defaultYear: 2026 })
    expect(legs.map((l) => l.scheduled_out_local?.slice(0, 10))).toEqual([
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
    ])
    expect(legs.every((l) => l.trip_number === 'L9Z30')).toBe(true)
    expect(legs.every((l) => l.role === 'PIC')).toBe(true)
  })

  it('rolls a pairing into January when it crosses the year', () => {
    const text = `
December Schedule
DEREK FARMER
(624619)
Last Updated Dec 30, 2026 09:00:00 EDT
L9Y31 : 30DEC
Base/Equip: LGA/EM7 CA01
WE 30  5001 LGA-ORD 0800 1000 0200
TH 31  5002 ORD-DEN 1100 1300 0200
FR 01  5003 DEN-LGA 0900 1500 0600
Crew:
CA 624619 FARMER, DEREK
`
    const legs = parseFlicaSchedule(text, { defaultYear: 2026 })
    expect(legs.map((l) => l.scheduled_out_local?.slice(0, 10))).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
    ])
  })
})

describe('filterAirlineLegs', () => {
  const legs = parseFlicaSchedule(FLICA_FIXTURE)

  it('filters deadheads when includeDeadheads is false', () => {
    const filtered = filterAirlineLegs(legs, { includeDeadheads: false })
    expect(filtered.every((l) => !l.is_deadhead)).toBe(true)
    expect(filtered.some((l) => l.flight_number === '5770')).toBe(false)
  })

  it('filters by date range', () => {
    const filtered = filterAirlineLegs(legs, {
      dateFrom: '2026-08-04',
      dateTo: '2026-08-04',
      includeDeadheads: true,
    })
    expect(filtered.every((l) => l.scheduled_out_local?.startsWith('2026-08-04'))).toBe(true)
  })

  it('keeps both Tuesday AC-swap and operating legs for a single-day fetch', () => {
    const pairing = parseFlicaSchedule(THREE_DAY_PAIRING_TSV, { defaultYear: 2026 })
    const filtered = filterAirlineLegs(pairing, {
      dateFrom: '2026-08-18',
      dateTo: '2026-08-18',
      includeDeadheads: false,
      includeScheduled: true,
      todayYmd: '2026-08-18',
    })
    expect(filtered.map((l) => l.flight_number)).toEqual(['4393', '4776'])
    expect(filtered.every((l) => !l.is_deadhead)).toBe(true)
  })

  it('parses updated FLICA gate times for a completed Aug 20 pairing (4809 / 4584)', () => {
    const text = `
August Schedule
DEREK FARMER
(624619)
Last Updated Aug 20, 2026 14:00:00 EDT
L7H18 : 18AUG  TUE-THU  BSE REPT: 0515L
Base/Equip: LGA/EM7 CA01FO01
TH	20	 	*	4809	ATL-LGA	0606	0809	 0203	0059	B48
TH	20	 	 	4584	LGA-RIC	0908	1103	 0155	0038	C64
TH	20	 	 	4584	RIC-LGA	1141	1256
Crew:
CA 624619 FARMER, DEREK FO 626955 JOHNS, LUKE
`
    const legs = parseFlicaSchedule(text, { defaultYear: 2026 })
    const atlLga = legs.find((l) => l.flight_number === '4809')
    expect(atlLga?.scheduled_out_local).toBe('2026-08-20 06:06:00')
    expect(atlLga?.scheduled_in_local).toBe('2026-08-20 08:09:00')
    expect(atlLga?.block_minutes).toBe(123)
    expect(atlLga?.is_deadhead).toBe(false)

    const lgaRic = legs.find(
      (l) => l.flight_number === '4584' && l.dep_airport === 'LGA'
    )
    expect(lgaRic?.scheduled_out_local).toBe('2026-08-20 09:08:00')
    expect(lgaRic?.scheduled_in_local).toBe('2026-08-20 11:03:00')
    expect(lgaRic?.block_minutes).toBe(115)

    const ricLga = legs.find(
      (l) => l.flight_number === '4584' && l.dep_airport === 'RIC'
    )
    expect(ricLga?.scheduled_out_local).toBe('2026-08-20 11:41:00')
    expect(ricLga?.scheduled_in_local).toBe('2026-08-20 12:56:00')
    expect(ricLga?.block_minutes).toBeNull()
  })

  it('parses updated FLICA gate times for a completed leg (4349 LGA-ATL)', () => {
    const text = `
August Schedule
DEREK FARMER
(624619)
Last Updated Aug 19, 2026 14:00:00 EDT
L7H18 : 19AUG
Base/Equip: LGA/EM7 CA01FO01
WE 19   4349 LGA-ATL 1144 1352 0208
Crew:
CA 624619 FARMER, DEREK FO 626955 JOHNS, LUKE
`
    const legs = parseFlicaSchedule(text, { defaultYear: 2026 })
    const leg = legs.find((l) => l.flight_number === '4349')
    expect(leg?.scheduled_out_local).toBe('2026-08-19 11:44:00')
    expect(leg?.scheduled_in_local).toBe('2026-08-19 13:52:00')
    expect(leg?.block_minutes).toBe(128)
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

  it('excludes a same-day leg that has not yet departed when nowIso is before its scheduled departure', () => {
    // Aug 19 pairing: 4669 STL-LGA departs 0600, 4349 LGA-ATL departs 1150.
    // "Now" is 09:30 local — 4669 already gone, 4349 not yet departed.
    // nowIso must be a LOCAL datetime string (same tz as scheduled_out_local), not UTC.
    const pairing = parseFlicaSchedule(THREE_DAY_PAIRING_TSV, { defaultYear: 2026 })
    const stats = filterAirlineLegsWithStats(pairing, {
      dateFrom: '2026-08-19',
      dateTo: '2026-08-19',
      includeDeadheads: false,
      includeScheduled: false,
      todayYmd: '2026-08-19',
      nowIso: '2026-08-19T09:30',
    })
    expect(stats.filtered.map((l) => l.flight_number)).toEqual(['4669'])
    expect(stats.excludedScheduled).toBe(1)
  })

  it('includes a same-day leg that has not yet departed when includeScheduled is true', () => {
    const pairing = parseFlicaSchedule(THREE_DAY_PAIRING_TSV, { defaultYear: 2026 })
    const filtered = filterAirlineLegs(pairing, {
      dateFrom: '2026-08-19',
      dateTo: '2026-08-19',
      includeDeadheads: false,
      includeScheduled: true,
      todayYmd: '2026-08-19',
      nowIso: '2026-08-19T09:30',
    })
    expect(filtered.map((l) => l.flight_number)).toEqual(['4669', '4349'])
  })

  it('excludes all same-day legs not yet departed when nowIso is before the first departure', () => {
    const pairing = parseFlicaSchedule(THREE_DAY_PAIRING_TSV, { defaultYear: 2026 })
    const stats = filterAirlineLegsWithStats(pairing, {
      dateFrom: '2026-08-19',
      dateTo: '2026-08-19',
      includeDeadheads: false,
      includeScheduled: false,
      todayYmd: '2026-08-19',
      nowIso: '2026-08-19T04:00',
    })
    expect(stats.filtered).toHaveLength(0)
    expect(stats.excludedScheduled).toBe(2)
  })

  it('excludes a 15:00 Eastern leg when UTC now is 17:30 (still in the future locally)', () => {
    const text = `
August Schedule
DEREK FARMER
(624619)
Last Updated Aug 25, 2026 09:00:00 EDT
L9Z25 : 25AUG
Base/Equip: LGA/EM7 CA01
TU 25  9999 LGA-DCA 1500 1630 0130
Crew:
CA 624619 FARMER, DEREK
`
    const legs = parseFlicaSchedule(text, { defaultYear: 2026 })
    const nowMs = Date.parse('2026-08-25T17:30:00.000Z')
    const stats = filterAirlineLegsWithStats(legs, {
      dateFrom: '2026-08-25',
      dateTo: '2026-08-25',
      includeDeadheads: false,
      includeScheduled: false,
      nowMs,
    })
    expect(stats.filtered).toHaveLength(0)
    expect(stats.excludedScheduled).toBe(1)
  })

  it('uses departure-airport timezone so STL 06:00 Central is departed at 09:30 Eastern', () => {
    const pairing = parseFlicaSchedule(THREE_DAY_PAIRING_TSV, { defaultYear: 2026 })
    const nowMs = DateTime.fromObject(
      { year: 2026, month: 8, day: 19, hour: 9, minute: 30 },
      { zone: 'America/New_York' }
    ).toUTC().toMillis()
    const stats = filterAirlineLegsWithStats(pairing, {
      dateFrom: '2026-08-19',
      dateTo: '2026-08-19',
      includeDeadheads: false,
      includeScheduled: false,
      nowMs,
    })
    expect(stats.filtered.map((l) => l.flight_number)).toEqual(['4669'])
    expect(stats.excludedScheduled).toBe(1)
  })

  it('excludes a same-day leg with missing Out unless includeScheduled is true', () => {
    const pairing = parseFlicaSchedule(THREE_DAY_PAIRING_TSV, { defaultYear: 2026 })
    const broken = pairing
      .filter((l) => l.scheduled_out_local?.startsWith('2026-08-19'))
      .map((l) =>
        l.flight_number === '4349' ? { ...l, scheduled_out_local: null } : l
      )
    const nowMs = DateTime.fromObject(
      { year: 2026, month: 8, day: 19, hour: 14, minute: 0 },
      { zone: 'America/New_York' }
    ).toUTC().toMillis()
    const excluded = filterAirlineLegsWithStats(broken, {
      dateFrom: '2026-08-19',
      dateTo: '2026-08-19',
      includeDeadheads: false,
      includeScheduled: false,
      nowMs,
    })
    expect(excluded.filtered.map((l) => l.flight_number)).toEqual(['4669'])
    expect(excluded.excludedScheduled).toBe(1)

    const included = filterAirlineLegs(broken, {
      dateFrom: '2026-08-19',
      dateTo: '2026-08-19',
      includeDeadheads: false,
      includeScheduled: true,
      nowMs,
    })
    expect(included.map((l) => l.flight_number)).toEqual(['4669', '4349'])
  })

  it('includes a slightly-future bid Out when AeroDataBox Off/On shows the flight already operated', () => {
    const pairing = parseFlicaSchedule(THREE_DAY_PAIRING_TSV, { defaultYear: 2026 })
    const nowMs = DateTime.fromObject(
      { year: 2026, month: 8, day: 19, hour: 11, minute: 40 },
      { zone: 'America/New_York' }
    ).toUTC().toMillis()
    const withOff = pairing
      .filter((l) => l.scheduled_out_local?.startsWith('2026-08-19'))
      .map((l) =>
        l.flight_number === '4349'
          ? { ...l, actual_off_local: '2026-08-19 11:35:00' }
          : l
      )
    const stats = filterAirlineLegsWithStats(withOff, {
      dateFrom: '2026-08-19',
      dateTo: '2026-08-19',
      includeDeadheads: false,
      includeScheduled: false,
      nowMs,
    })
    expect(stats.filtered.map((l) => l.flight_number)).toEqual(['4669', '4349'])
    expect(stats.excludedScheduled).toBe(0)
  })
})

describe('pickFlicaGateHhmm', () => {
  it('keeps the first Out/In/block triple on a normal refrigerator row', () => {
    expect(pickFlicaGateHhmm(['0603', '0727', '0124', '0108'], null)).toEqual({
      depHhmm: '0603',
      arrHhmm: '0727',
      blockHhmm: '0124',
    })
  })

  it('prefers a later published Out/In/block triple when bid times are still present', () => {
    expect(
      pickFlicaGateHhmm(['0609', '0825', '0216', '0047', '0606', '0809', '0203'], null)
    ).toEqual({
      depHhmm: '0606',
      arrHhmm: '0809',
      blockHhmm: '0203',
    })
  })

  it('does not steal TBLK/duty numbers from a timezone-crossing row', () => {
    expect(
      pickFlicaGateHhmm(
        ['0835', '0957', '0222', '0346', '0412', '0552', '0537', '1903'],
        null
      )
    ).toEqual({
      depHhmm: '0835',
      arrHhmm: '0957',
      blockHhmm: '0222',
    })
  })

  it('prefers a later published Out/In pair when the actuals omit BLKT', () => {
    expect(
      pickFlicaGateHhmm(['0609', '0825', '0216', '0047', '0606', '0809'], null)
    ).toEqual({
      depHhmm: '0606',
      arrHhmm: '0809',
      blockHhmm: '0203',
    })
  })

  it('prefers stacked sked/act cell pairs (Out_sked Out_act In_sked In_act)', () => {
    expect(
      pickFlicaGateHhmm(['0609', '0606', '0825', '0809', '0216', '0203'], null)
    ).toEqual({
      depHhmm: '0606',
      arrHhmm: '0809',
      blockHhmm: '0203',
    })
  })
})

describe('parseFlicaSchedule published actuals', () => {
  it('maps dual-column 4809 bid+published times to published Out/In/block', () => {
    const text = `
August Schedule
DEREK FARMER
(624619)
Last Updated Aug 20, 2026 14:00:00 EDT
L7H18 : 18AUG
Base/Equip: LGA/EM7 CA01FO01
TH	20	 	*	4809	ATL-LGA	0609	0825	0216	0047	0606	0809	0203
Crew:
CA 624619 FARMER, DEREK FO 626955 JOHNS, LUKE
`
    const legs = parseFlicaSchedule(text, { defaultYear: 2026 })
    const atlLga = legs.find((l) => l.flight_number === '4809')
    expect(atlLga?.scheduled_out_local).toBe('2026-08-20 06:06:00')
    expect(atlLga?.scheduled_in_local).toBe('2026-08-20 08:09:00')
    expect(atlLga?.block_minutes).toBe(123)
  })

  it('maps dual-column published Out/In when the actuals omit BLKT', () => {
    const text = `
August Schedule
DEREK FARMER
(624619)
Last Updated Aug 20, 2026 14:00:00 EDT
L7H18 : 18AUG
Base/Equip: LGA/EM7 CA01FO01
TH	20	 	*	4809	ATL-LGA	0609	0825	0216	0047	0606	0809
Crew:
CA 624619 FARMER, DEREK FO 626955 JOHNS, LUKE
`
    const legs = parseFlicaSchedule(text, { defaultYear: 2026 })
    const atlLga = legs.find((l) => l.flight_number === '4809')
    expect(atlLga?.scheduled_out_local).toBe('2026-08-20 06:06:00')
    expect(atlLga?.scheduled_in_local).toBe('2026-08-20 08:09:00')
    expect(atlLga?.block_minutes).toBe(123)
  })

  it('folds a continuation row of published actuals into the bid leg', () => {
    const html = `
<html><body>
<div>Last Updated Aug 20, 2026 16:00:00 EDT</div>
<div>L7H18 : 18AUG</div>
<div>Base/Equip: LGA/EM7 CA01FO01</div>
<table>
<tr><td>TH</td><td>20</td><td></td><td>*</td><td>4809</td><td>ATL-LGA</td><td>0609</td><td>0825</td><td>0216</td><td>0047</td><td>B48</td></tr>
<tr><td></td><td></td><td></td><td></td><td></td><td></td><td>0606</td><td>0809</td><td>0203</td></tr>
<tr><td>TH</td><td>20</td><td></td><td></td><td>4584</td><td>LGA-RIC</td><td>0912</td><td>1047</td><td>0135</td></tr>
<tr><td></td><td></td><td></td><td></td><td></td><td></td><td>0908</td><td>1103</td></tr>
</table>
<div>Crew:</div>
<div>CA 624619 FARMER, DEREK FO 626955 JOHNS, LUKE</div>
</body></html>
`
    const legs = parseFlicaSchedule(html, { defaultYear: 2026 })
    const atlLga = legs.find((l) => l.flight_number === '4809')
    expect(atlLga?.scheduled_out_local).toBe('2026-08-20 06:06:00')
    expect(atlLga?.scheduled_in_local).toBe('2026-08-20 08:09:00')
    expect(atlLga?.block_minutes).toBe(123)

    const lgaRic = legs.find((l) => l.flight_number === '4584' && l.dep_airport === 'LGA')
    expect(lgaRic?.scheduled_out_local).toBe('2026-08-20 09:08:00')
    expect(lgaRic?.scheduled_in_local).toBe('2026-08-20 11:03:00')
  })

  it('parses classic FLICA CGI with published actuals on the next unclosed row', () => {
    const html = `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN">
<html><body>
<table border=0 cellpadding=0 cellspacing=0>
<tr><td colspan=12><font size=2><b>L7H18 : 18AUG</b></font>
<tr><td colspan=12><font size=2>Base/Equip: LGA/EM7 CA01FO01</font>
<tr>
<td><font size=2>TH</font>
<td><font size=2>20</font>
<td><font size=2>&nbsp;</font>
<td><font size=2>*</font>
<td><font size=2>4809</font>
<td><font size=2>ATL-LGA</font>
<td><font size=2>0609</font>
<td><font size=2>0825</font>
<td><font size=2>0216</font>
<tr>
<td><font size=2>&nbsp;</font>
<td><font size=2>&nbsp;</font>
<td><font size=2>&nbsp;</font>
<td><font size=2>&nbsp;</font>
<td><font size=2>&nbsp;</font>
<td><font size=2>&nbsp;</font>
<td><font size=2>0606</font>
<td><font size=2>0809</font>
<td><font size=2>0203</font>
<tr><td colspan=12>Crew:
<tr><td colspan=12>CA 624619 FARMER, DEREK FO 626955 JOHNS, LUKE
</table>
</body></html>`
    const legs = parseFlicaSchedule(html, { defaultYear: 2026 })
    const atlLga = legs.find((l) => l.flight_number === '4809')
    expect(atlLga?.scheduled_out_local).toBe('2026-08-20 06:06:00')
    expect(atlLga?.scheduled_in_local).toBe('2026-08-20 08:09:00')
    expect(atlLga?.block_minutes).toBe(123)
  })
})

describe('overlayFlicaPairingLegs', () => {
  it('replaces month-refrigerator bid times with pairing-page published actuals', () => {
    const month = parseFlicaSchedule(
      `
L7H18 : 18AUG
Base/Equip: LGA/EM7 CA01
TH 20  4809 ATL-LGA 0609 0825 0216
`,
      { defaultYear: 2026 }
    )
    const pairing = parseFlicaSchedule(
      `
Last Updated Aug 20, 2026 16:00:00 EDT
L7H18 : 18AUG
Base/Equip: LGA/EM7 CA01
TH 20  4809 ATL-LGA 0606 0809 0203
`,
      { defaultYear: 2026 }
    )
    const merged = overlayFlicaPairingLegs(month, pairing)
    expect(merged[0]?.scheduled_out_local).toBe('2026-08-20 06:06:00')
    expect(merged[0]?.scheduled_in_local).toBe('2026-08-20 08:09:00')
    expect(merged[0]?.block_minutes).toBe(123)
  })
})

describe('parseFlicaLastUpdatedMs', () => {
  it('parses Last Updated with an Eastern abbreviation', () => {
    const ms = parseFlicaLastUpdatedMs('Last Updated Aug 20, 2026 14:00:00 EDT')
    expect(ms).toBe(
      DateTime.fromObject(
        { year: 2026, month: 8, day: 20, hour: 14, minute: 0, second: 0 },
        { zone: 'America/New_York' }
      )
        .toUTC()
        .toMillis()
    )
  })
})
