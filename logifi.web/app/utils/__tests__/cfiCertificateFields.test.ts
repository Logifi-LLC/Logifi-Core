import { describe, expect, it } from 'vitest'
import {
  cfiCertificateNumberError,
  cfiExpirationError,
  cfiSignerNameError,
  hasCfiIdentity,
} from '../cfiCertificateFields'

describe('guest sign identity', () => {
  it('rejects missing certificate number and expiration', () => {
    expect(cfiCertificateNumberError('')).toBe('Certificate number is required')
    expect(cfiExpirationError('')).toBe('Certificate expiration is required')
    expect(
      hasCfiIdentity({
        name: 'Pat Instructor',
        certificateNumber: '',
        expiration: '',
      })
    ).toBe(false)
  })

  it('rejects invalid expiration dates', () => {
    expect(cfiExpirationError('not-a-date')).toBe('Enter a valid expiration date')
    expect(cfiExpirationError('2026-13-40')).toBe('Enter a valid expiration date')
  })

  it('accepts name, certificate number, and a calendar expiration', () => {
    expect(cfiSignerNameError('Pat Instructor')).toBeNull()
    expect(cfiCertificateNumberError('4170037')).toBeNull()
    expect(cfiExpirationError('2027-12-31')).toBeNull()
    expect(
      hasCfiIdentity({
        name: 'Pat Instructor',
        certificateNumber: '4170037',
        expiration: '2027-12-31',
      })
    ).toBe(true)
  })
})
