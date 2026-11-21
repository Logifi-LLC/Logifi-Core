import { describe, expect, it } from 'vitest'
import {
  formatFallbackAppVersionLabel,
  formatLogifiVersionLabel,
} from '../appVersionFormat'

describe('appVersionFormat', () => {
  it('formats a version label', () => {
    expect(formatLogifiVersionLabel('1.0.9')).toBe('Logifi 1.0.9')
    expect(formatLogifiVersionLabel('1.0.9.1')).toBe('Logifi 1.0.9.1')
  })

  it('uses fallback label from web version constant', () => {
    expect(formatFallbackAppVersionLabel()).toBe('Logifi 1.0.10')
    expect(formatFallbackAppVersionLabel('2.3.4')).toBe('Logifi 2.3.4')
  })
})