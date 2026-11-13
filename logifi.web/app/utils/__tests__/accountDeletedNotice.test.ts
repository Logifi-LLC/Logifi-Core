import { afterEach, describe, expect, it } from 'vitest'
import { consumeAccountDeletedNotice, markAccountDeletedNotice } from '../accountDeletedNotice'

describe('accountDeletedNotice', () => {
  afterEach(() => {
    sessionStorage.removeItem('logifi:account-deleted-notice')
  })

  it('consumes the notice once', () => {
    markAccountDeletedNotice()
    expect(consumeAccountDeletedNotice()).toBe(true)
    expect(consumeAccountDeletedNotice()).toBe(false)
  })
})
