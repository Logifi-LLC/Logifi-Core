import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  decodeFlicaHtmlBytes,
  extractFlicaToken,
  flicaBlockDate,
  findScheduleDetailLinks,
  findScheduleMonthLinks,
  htmlLooksLikeScheduleDetail,
  loginFlica,
  FlicaClientError,
} from '../flicaClient'
import { parseFlicaSchedule } from '../flicaParse'

const SCHEDULE_FIXTURE = `
August Schedule
DEREK FARMER
(624619)
Last Updated Aug 12, 2026 09:51:14 EDT
L7513 : 04AUG  EXCEPT SUN SAT  BSE REPT: 0520L
Base/Equip: LGA/EM7 CA01FO01
TU 04  5770 LGA-DCA0605 0712 0107 0100 8823
Crew:
CA 624619 FARMER, DEREK FO 627385 SUTTON, DREW
`

const L7G13_DETAIL = `
L7G13 : 12AUG  ONLY ON WED  BSE REPT: 1019L
Base/Equip: LGA/EM7 CA01
WE 12  4442 LGA-RIC 1059 1226 0127
WE 12  4442 RIC-LGA 1310 1426 0116
Crew:
CA 624619 FARMER, DEREK
`

describe('flicaBlockDate', () => {
  it('formats Aug 2026 as 0826', () => {
    expect(flicaBlockDate(2026, 8)).toBe('0826')
  })
})

describe('extractFlicaToken / findScheduleDetailLinks', () => {
  it('pulls token and scheduledetail URLs from leftmenu-style HTML', () => {
    const html = `
      <a href="scheduledetail.cgi?BlockDate=0826&token=000000006BF24E6901DD2A95679A3936">August</a>
      <script>var t="scheduledetail.cgi?GO=1&token=000000006BF24E6901DD2A97D41730B8&BlockDate=0826";</script>
    `
    expect(extractFlicaToken(html)).toMatch(/^000000006BF24E69/i)
    const links = findScheduleDetailLinks(html)
    expect(links.some((l) => l.includes('BlockDate=0826'))).toBe(true)
    expect(links.some((l) => l.includes('/full/scheduledetail.cgi'))).toBe(true)
  })

  it('prefers GO=1 token when warm page refreshes it', () => {
    const html = `
      token=000000006BF24E6901DD2A95679A3936
      <a href="/full/scheduledetail.cgi?GO=1&token=000000006BF24E6901DD2A99B0E9780E&BlockDate=0826&JUNK=1">go</a>
    `
    expect(extractFlicaToken(html)).toBe('000000006BF24E6901DD2A99B0E9780E')
  })
})

describe('findScheduleMonthLinks', () => {
  it('finds month anchors for target months', () => {
    const html = `
      <a href="sched_aug.cgi">August</a>
      <a href="sched_sep.cgi">September 2026</a>
      <a href="other.cgi">Bidding</a>
    `
    const links = findScheduleMonthLinks(html, [{ year: 2026, month: 8 }])
    expect(links).toContain('/online/sched_aug.cgi')
  })
})

describe('htmlLooksLikeScheduleDetail', () => {
  it('rejects crew mainmenu chrome', () => {
    const menu = `
      <html><body>Crewmember Menu Schedules Bidding
      <a href="schedules.cgi">Schedules</a>
      Block credit summary folder
      </body></html>
    `
    expect(htmlLooksLikeScheduleDetail(menu)).toBe(false)
  })

  it('accepts trip detail with L7G13 and legs', () => {
    expect(htmlLooksLikeScheduleDetail(L7G13_DETAIL)).toBe(true)
  })

  it('accepts table HTML via parser even when raw-leg regex fails', async () => {
    const { htmlHasParseableScheduleLegs } = await import('../flicaClient')
    const html = `
      <div>L7G13 : 12AUG</div>
      <table>
        <tr><td>WE</td><td>12</td><td></td><td>4442</td><td>LGA-RIC</td><td>1059</td><td>1226</td><td>0127</td></tr>
        <tr><td>WE</td><td>12</td><td></td><td>4442</td><td>RIC-LGA</td><td>1310</td><td>1426</td><td>0116</td></tr>
      </table>
    `
    expect(htmlLooksLikeScheduleDetail(html)).toBe(false)
    expect(htmlHasParseableScheduleLegs(html)).toBe(true)
  })

  it('does not treat Location: as a trip header', () => {
    const warm = `
      <html><head><meta http-equiv="refresh" content="0;url=scheduledetail.cgi?GO=1"></head>
      <body>Location: /full/scheduledetail.cgi?GO=1&token=abc</body></html>
    `
    expect(htmlLooksLikeScheduleDetail(warm)).toBe(false)
  })
})

describe('extractCandidateUrls', () => {
  it('collects frame src and anchor hrefs', async () => {
    const { extractCandidateUrls } = await import('../flicaClient')
    const html = `
      <frameset>
        <frame src="leftnav.cgi">
        <frame src="/online/content.cgi?doc=1">
      </frameset>
      <a href="august.cgi">August</a>
    `
    const urls = extractCandidateUrls(html)
    expect(urls.some((u) => u.includes('leftnav.cgi'))).toBe(true)
    expect(urls.some((u) => u.includes('content.cgi'))).toBe(true)
    expect(urls.some((u) => u.includes('august.cgi'))).toBe(true)
  })
})

describe('loginFlica', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws login_failed when response stays on login page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        const u = String(url)
        if (u.includes('login/index')) {
          return {
            ok: true,
            status: 200,
            headers: { get: () => null, getSetCookie: () => [] },
            text: async () => '<html><login></login></html>',
          }
        }
        return {
          ok: true,
          status: 200,
          headers: { get: () => null, getSetCookie: () => [] },
          text: async () =>
            '<html>Sign in to FLICA. Invalid password. FailedAttempt</html>',
        }
      })
    )

    await expect(
      loginFlica({ host: 'rpa.flica.net', username: 'RPA1', password: 'bad' })
    ).rejects.toMatchObject({ code: 'login_failed' } satisfies Partial<FlicaClientError>)
  })

  it('posts UserId and Password form fields', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const u = String(url)
      if (u.includes('login/index')) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => null, getSetCookie: () => [] },
          text: async () => '<html>login</html>',
        }
      }
      if (u.includes('flicaLogon.cgi') && init?.method === 'POST') {
        const body = String(init.body ?? '')
        expect(body).toContain('UserId=RPA624619')
        expect(body).toContain('Password=ok')
        expect(body).not.toMatch(/(^|&)id=/)
        expect(body).not.toMatch(/(^|&)password=/)
        return {
          ok: true,
          status: 302,
          headers: {
            get: (name: string) =>
              name.toLowerCase() === 'location' ? '/online/mainmenu.cgi' : null,
            getSetCookie: () => ['SID=abc; Path=/'],
          },
          text: async () => '',
        }
      }
      if (u.includes('mainmenu.cgi')) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => null, getSetCookie: () => [] },
          text: async () => '<html><body>Crewmember Menu Schedules</body></html>',
        }
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => null, getSetCookie: () => [] },
        text: async () => '<html></html>',
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    await loginFlica({
      host: 'rpa.flica.net',
      username: 'RPA624619',
      password: 'ok',
    })
  })

  it('succeeds when logon redirects away from login and mainmenu loads', async () => {
    let step = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        const u = String(url)
        step++
        if (u.includes('login/index')) {
          return {
            ok: true,
            status: 200,
            headers: { get: () => null, getSetCookie: () => ['SID=abc'] },
            text: async () => '<html>login</html>',
          }
        }
        if (u.includes('flicaLogon.cgi') && init?.method === 'POST') {
          return {
            ok: true,
            status: 302,
            headers: {
              get: (name: string) =>
                name.toLowerCase() === 'location' ? '/online/mainmenu.cgi' : null,
              getSetCookie: () => ['SID=abc; Path=/'],
            },
            text: async () => '',
          }
        }
        if (u.includes('mainmenu.cgi')) {
          return {
            ok: true,
            status: 200,
            headers: { get: () => null, getSetCookie: () => [] },
            text: async () => '<html><body>Crewmember Menu Schedules</body></html>',
          }
        }
        return {
          ok: true,
          status: 200,
          headers: { get: () => null, getSetCookie: () => [] },
          text: async () => '<html></html>',
        }
      })
    )

    const session = await loginFlica({
      host: 'rpa.flica.net',
      username: 'RPA624619',
      password: 'ok',
    })
    expect(session.host).toBe('rpa.flica.net')
    expect(step).toBeGreaterThan(1)
  })
})

describe('decodeFlicaHtmlBytes', () => {
  it('decodes ISO-8859-1 nbsp from CGI pages without charset header', () => {
    const buf = Buffer.from('WE\xA012\xA04442 LGA-RIC', 'latin1')
    const html = decodeFlicaHtmlBytes(buf, 'text/html', 'https://rpa.flica.net/full/scheduledetail.cgi?GO=1')
    expect(html).toContain('\u00a0')
    expect(html).not.toContain('\ufffd')
  })

  it('honors utf-8 charset when declared', () => {
    const buf = Buffer.from('café', 'utf8')
    expect(decodeFlicaHtmlBytes(buf, 'text/html; charset=utf-8', '/ui/public/login')).toBe('café')
  })
})

describe('parse after scrape fixture', () => {
  it('parses schedule detail HTML text into legs', () => {
    const legs = parseFlicaSchedule(SCHEDULE_FIXTURE)
    expect(legs.some((l) => l.flight_number === '5770')).toBe(true)
  })
})
