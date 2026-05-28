import { describe, expect, it } from 'vitest'
import { pickLanIPv4FromAddresses } from '../../server/utils/digifiCapture'

describe('pickLanIPv4FromAddresses', () => {
  it('prefers private routable LAN over link-local', () => {
    expect(
      pickLanIPv4FromAddresses(['169.254.102.145', '192.168.1.182', '10.0.0.5'])
    ).toBe('192.168.1.182')
  })

  it('skips loopback and link-local when no private IP exists', () => {
    expect(pickLanIPv4FromAddresses(['127.0.0.1', '169.254.1.1'])).toBeNull()
  })

  it('accepts 10.x and 172.16–31.x private ranges', () => {
    expect(pickLanIPv4FromAddresses(['10.0.0.8'])).toBe('10.0.0.8')
    expect(pickLanIPv4FromAddresses(['172.20.10.4'])).toBe('172.20.10.4')
  })
})
