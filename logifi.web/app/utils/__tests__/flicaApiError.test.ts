import { describe, expect, it } from 'vitest'
import { messageFromFlicaApiError } from '../flicaApiError'

describe('messageFromFlicaApiError', () => {
  it('maps WKWebView Load failed / no response to the live API host hint', () => {
    const message = messageFromFlicaApiError(
      {
        message:
          '[POST] "https://dev.logifi.io/api/flica/connect": <no response> Load failed',
      },
      'Failed to connect FLICA'
    )
    expect(message).toContain('Could not reach the Autofi API')
    expect(message).toContain('https://www.logifi.io')
    expect(message).not.toContain('dev.logifi.io/api')
  })

  it('maps Failed to fetch the same way', () => {
    const message = messageFromFlicaApiError(
      new TypeError('Failed to fetch'),
      'Failed to connect FLICA'
    )
    expect(message).toContain('Could not reach the Autofi API')
  })

  it('tells TestFlight to use www.logifi.io on 404', () => {
    const message = messageFromFlicaApiError({ statusCode: 404 }, 'Failed to connect FLICA')
    expect(message).toContain('FLICA API not found')
    expect(message).toContain('https://www.logifi.io')
    expect(message).not.toContain('Rebuild iOS against the `dev` API')
  })

  it('keeps server statusMessage for credential failures', () => {
    expect(
      messageFromFlicaApiError(
        { data: { statusMessage: 'FLICA login failed. Check User ID and password, then try again.' } },
        'Failed to connect FLICA'
      )
    ).toBe('FLICA login failed. Check User ID and password, then try again.')
  })

  it('falls back when the error is empty', () => {
    expect(messageFromFlicaApiError(null, 'Failed to connect FLICA')).toBe('Failed to connect FLICA')
  })
})
