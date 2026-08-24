import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { processMockPayment } from '../../server/utils/creditsMockPayment'

describe('processMockPayment', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves after simulated delay with pricing', async () => {
    const promise = processMockPayment({ paymentMethod: 'lightning', numberOfCredits: 5 })
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result.success).toBe(true)
    expect(result.totalCents).toBe(200)
    expect(result.paymentMethod).toBe('lightning')
  })

  it('rejects invalid purchase before delay', async () => {
    await expect(
      processMockPayment({ paymentMethod: 'stripe', numberOfCredits: 1 })
    ).rejects.toThrow()
  })
})
