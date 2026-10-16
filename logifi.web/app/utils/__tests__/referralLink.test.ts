import { describe, expect, it } from 'vitest'
import { isIosBrowserUserAgent, referralLinkRedirect } from '../referralLink'

describe('referral link routing', () => {
  it('treats iPhone and iPad browsers as iOS, and leaves desktop alone', () => {
    expect(isIosBrowserUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true)
    expect(isIosBrowserUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe(true)
    expect(isIosBrowserUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false)
  })

  it('keeps desktop on the landing page and shows the code page on iOS', () => {
    expect(
      referralLinkRedirect({
        path: '/r/ABCD234H',
        refQuery: null,
        webSignup: false,
        iosBrowser: false,
        native: false,
      })
    ).toEqual({ path: '/', query: { ref: 'ABCD234H' } })

    expect(
      referralLinkRedirect({
        path: '/',
        refQuery: 'ABCD234H',
        webSignup: false,
        iosBrowser: true,
        native: false,
      })
    ).toEqual({ path: '/r/ABCD234H' })

    expect(
      referralLinkRedirect({
        path: '/r/ABCD234H',
        refQuery: null,
        webSignup: false,
        iosBrowser: true,
        native: false,
      })
    ).toBeNull()

    expect(
      referralLinkRedirect({
        path: '/',
        refQuery: 'ABCD234H',
        webSignup: true,
        iosBrowser: true,
        native: false,
      })
    ).toBeNull()
  })

  it('sends the installed app to signup with the code', () => {
    expect(
      referralLinkRedirect({
        path: '/r/ABCD234H',
        refQuery: null,
        webSignup: false,
        iosBrowser: true,
        native: true,
      })
    ).toEqual({ path: '/dashboard', query: { ref: 'ABCD234H' } })
  })
})
