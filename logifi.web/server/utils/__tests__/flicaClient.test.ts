import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  findScheduleMonthLinks,
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

describe('findScheduleMonthLinks', () => {
  it('finds month anchors for target months', () => {
    const html = `
      <a href="sched_aug.cgi">August</a>
      <a href="sched_sep.cgi">September 2026</a>
      <a href="other.cgi">Bidding</a>
    `
    const links = findScheduleMonthLinks(html, [{ year: 2026, month: 8 }])
    expect(links).toContain('sched_aug.cgi')
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

describe('parse after scrape fixture', () => {
  it('parses schedule detail HTML text into legs', () => {
    const legs = parseFlicaSchedule(SCHEDULE_FIXTURE)
    expect(legs.some((l) => l.flight_number === '5770')).toBe(true)
  })
})
