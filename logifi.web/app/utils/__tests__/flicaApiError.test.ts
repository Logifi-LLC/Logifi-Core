import { describe, expect, it } from 'vitest'
import {
  FLICA_API_NOT_FOUND_PROD,
  FLICA_NETWORK_ERROR_PROD,
  messageFromFlicaApiError,
} from '../flicaApiError'
import { LIVE_IOS_API_BASE } from '../apiBase'

describe('messageFromFlicaApiError', () => {
  it('maps WKWebView Load failed / no response to a reachability message', () => {
    const message = messageFromFlicaApiError(
      {
        message:
          '[POST] "https://dev.logifi.io/api/flica/connect": <no response> Load failed',
      },
      'Failed to connect FLICA'
    )
    if (import.meta.dev) {
      expect(message).toContain('Could not reach the Autofi API')
      expect(message).toContain('https://www.logifi.io')
      expect(message).not.toContain('dev.logifi.io/api')
    } else {
      expect(message).toBe(FLICA_NETWORK_ERROR_PROD)
    }
  })

  it('maps Failed to fetch the same way', () => {
    const message = messageFromFlicaApiError(
      new TypeError('Failed to fetch'),
      'Failed to connect FLICA'
    )
    if (import.meta.dev) {
      expect(message).toContain('Could not reach the Autofi API')
    } else {
      expect(message).toBe(FLICA_NETWORK_ERROR_PROD)
    }
  })

  it('maps 404 to a dev host hint or short prod copy', () => {
    const message = messageFromFlicaApiError({ statusCode: 404 }, 'Failed to connect FLICA')
    if (import.meta.dev) {
      expect(message).toContain('FLICA API not found')
      expect(message).toContain('https://www.logifi.io')
      expect(message).not.toContain('Rebuild iOS against the `dev` API')
    } else {
      expect(message).toBe(FLICA_API_NOT_FOUND_PROD)
    }
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

  it('uses pilot-safe production copy without TestFlight or API host hints', () => {
    expect(FLICA_NETWORK_ERROR_PROD).toBe(
      "Couldn't reach Autofi. Try again when you have a connection."
    )
    expect(FLICA_API_NOT_FOUND_PROD).toBe("Autofi isn't available on this server.")
    for (const copy of [FLICA_NETWORK_ERROR_PROD, FLICA_API_NOT_FOUND_PROD]) {
      expect(copy).not.toContain('TestFlight')
      expect(copy).not.toContain('NUXT_PUBLIC_API_BASE')
      expect(copy).not.toContain(LIVE_IOS_API_BASE)
      expect(copy).not.toContain('dev.logifi.io')
    }
    const networkMessage = messageFromFlicaApiError(
      new TypeError('Failed to fetch'),
      'Failed to connect FLICA'
    )
    const notFoundMessage = messageFromFlicaApiError({ statusCode: 404 }, 'Failed to connect FLICA')
    if (import.meta.dev) {
      expect(networkMessage).toContain('Could not reach the Autofi API')
      expect(notFoundMessage).toContain('FLICA API not found')
    } else {
      expect(networkMessage).toBe(FLICA_NETWORK_ERROR_PROD)
      expect(notFoundMessage).toBe(FLICA_API_NOT_FOUND_PROD)
    }
  })
})
