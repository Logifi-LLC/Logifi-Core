import { describe, expect, it } from 'vitest'
import { qrSvgDataUrl } from '../qrDataUrl'

describe('qrSvgDataUrl', () => {
  it('encodes the token URL locally without a third-party host', () => {
    const url = 'https://logifi.io/guest-sign/abc-token'
    const dataUrl = qrSvgDataUrl(url, 120)
    expect(dataUrl.startsWith('data:image/svg+xml')).toBe(true)
    expect(dataUrl).toContain(encodeURIComponent('<svg'))
    expect(dataUrl).not.toContain('api.qrserver.com')
    expect(dataUrl).not.toContain('chart.googleapis.com')
  })
})
