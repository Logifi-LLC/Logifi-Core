import { describe, expect, it } from 'vitest'
import {
  formatFallbackAppVersionLabel,
  formatNativeAppVersionLabel,
  formatWebAppVersionLabel,
} from '../appVersionFormat'

describe('appVersionFormat', () => {
  it('formats native version and build', () => {
    expect(formatNativeAppVersionLabel('1.0', '8')).toBe('Logifi 1.0 (8)')
  })

  it('formats web package version without SHA', () => {
    expect(formatWebAppVersionLabel('1.0.0')).toBe('Logifi 1.0.0')
    expect(formatWebAppVersionLabel('1.0.0', '')).toBe('Logifi 1.0.0')
    expect(formatWebAppVersionLabel('1.0.0', '   ')).toBe('Logifi 1.0.0')
  })

  it('formats web package version with short SHA', () => {
    expect(formatWebAppVersionLabel('1.0.0', '301e0454abcd')).toBe('Logifi 1.0.0 (301e045)')
  })

  it('uses fallback label from package constant', () => {
    expect(formatFallbackAppVersionLabel()).toBe('Logifi 1.0.0')
    expect(formatFallbackAppVersionLabel('2.3.4')).toBe('Logifi 2.3.4')
  })
})