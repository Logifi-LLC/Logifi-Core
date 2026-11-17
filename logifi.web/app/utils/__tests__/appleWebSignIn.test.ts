import { describe, expect, it } from 'vitest'
import { isAppleWebSignInEnabled } from '../appleWebSignIn'

describe('isAppleWebSignInEnabled', () => {
  it('stays off unless the flag is an explicit on value', () => {
    expect(isAppleWebSignInEnabled('')).toBe(false)
    expect(isAppleWebSignInEnabled('false')).toBe(false)
    expect(isAppleWebSignInEnabled('off')).toBe(false)
    expect(isAppleWebSignInEnabled('true')).toBe(true)
    expect(isAppleWebSignInEnabled('ON')).toBe(true)
    expect(isAppleWebSignInEnabled('1')).toBe(true)
  })
})
