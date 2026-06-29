import { describe, expect, it, vi, beforeEach } from 'vitest'
import { finalizeDigifiScanBilling } from '../digifiScanBilling'

const consumeCreditForSpread = vi.fn()
const linkSpreadChargeToScanSession = vi.fn()

vi.mock('../creditsBalance', () => ({
  consumeCreditForSpread: (...args: unknown[]) => consumeCreditForSpread(...args),
  linkSpreadChargeToScanSession: (...args: unknown[]) => linkSpreadChargeToScanSession(...args),
}))

describe('finalizeDigifiScanBilling', () => {
  beforeEach(() => {
    consumeCreditForSpread.mockReset()
    linkSpreadChargeToScanSession.mockReset()
  })

  it('does not charge when session persist failed', async () => {
    const result = await finalizeDigifiScanBilling({} as never, 'user-1', {
      spreadId: '550e8400-e29b-41d4-a716-446655440000',
      layout: 'single',
      scanId: 'scan-1',
      insertError: { message: 'insert failed' },
      fallbackBalance: 4,
    })

    expect(result).toEqual({ ok: true, charged: false, balance: 4 })
    expect(consumeCreditForSpread).not.toHaveBeenCalled()
    expect(linkSpreadChargeToScanSession).not.toHaveBeenCalled()
  })

  it('charges only after successful session persist', async () => {
    consumeCreditForSpread.mockResolvedValue({ ok: true, charged: true, balance: 3 })
    linkSpreadChargeToScanSession.mockResolvedValue(undefined)

    const result = await finalizeDigifiScanBilling({} as never, 'user-1', {
      spreadId: '550e8400-e29b-41d4-a716-446655440000',
      layout: 'two-page',
      scanId: 'scan-1',
      insertError: null,
      fallbackBalance: 4,
    })

    expect(result).toEqual({ ok: true, charged: true, balance: 3 })
    expect(consumeCreditForSpread).toHaveBeenCalledWith({} as never, 'user-1', {
      spreadId: '550e8400-e29b-41d4-a716-446655440000',
      layout: 'two-page',
    })
    expect(linkSpreadChargeToScanSession).toHaveBeenCalledWith(
      {} as never,
      'user-1',
      '550e8400-e29b-41d4-a716-446655440000',
      'scan-1'
    )
  })

  it('does not link session when spread was already charged', async () => {
    consumeCreditForSpread.mockResolvedValue({ ok: true, charged: false, balance: 3 })

    await finalizeDigifiScanBilling({} as never, 'user-1', {
      spreadId: '550e8400-e29b-41d4-a716-446655440000',
      layout: 'single',
      scanId: 'scan-2',
      insertError: null,
      fallbackBalance: 3,
    })

    expect(consumeCreditForSpread).toHaveBeenCalled()
    expect(linkSpreadChargeToScanSession).not.toHaveBeenCalled()
  })
})
