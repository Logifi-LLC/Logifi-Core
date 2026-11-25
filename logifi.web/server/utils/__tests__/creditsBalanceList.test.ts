import { describe, expect, it, vi } from 'vitest'
import { listCreditTransactions } from '../creditsBalance'

function serviceWithLimitSpy() {
  const limit = vi.fn(async () => ({ data: [], error: null }))
  const chain = { select: () => chain, eq: () => chain, order: () => chain, limit }
  return { service: { from: vi.fn(() => chain) }, limit }
}

describe('listCreditTransactions', () => {
  it('falls back to the default page size for a non-numeric limit', async () => {
    const { service, limit } = serviceWithLimitSpy()
    await listCreditTransactions(service as never, 'user-1', Number.parseInt('abc', 10))
    expect(limit).toHaveBeenCalledWith(20)
  })

  it('clamps the limit to 1..100', async () => {
    const { service, limit } = serviceWithLimitSpy()
    await listCreditTransactions(service as never, 'user-1', 500)
    await listCreditTransactions(service as never, 'user-1', 0)
    expect(limit.mock.calls).toEqual([[100], [1]])
  })
})
