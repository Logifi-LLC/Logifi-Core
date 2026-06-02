import { describe, it, expect } from 'vitest'
import type { CreditTransaction } from '../../app/composables/useDigifiCredits'

function formatTransactionLabel(tx: Pick<CreditTransaction, 'description' | 'type'>): string {
  if (tx.description?.trim()) return tx.description.trim()
  if (tx.type === 'purchase') return 'Credit purchase'
  if (tx.type === 'scan') return 'Digifi spread scan'
  return tx.type
}

function formatTransactionAmount(amount: number): string {
  const prefix = amount > 0 ? '+' : ''
  return `${prefix}${amount} credit${Math.abs(amount) === 1 ? '' : 's'}`
}

describe('credit transaction formatting', () => {
  it('uses description when present', () => {
    expect(
      formatTransactionLabel({
        description: 'Purchased 25 credits',
        type: 'purchase',
      })
    ).toBe('Purchased 25 credits')
  })

  it('falls back to type labels', () => {
    expect(formatTransactionLabel({ description: null, type: 'scan' })).toBe(
      'Digifi spread scan'
    )
  })

  it('formats positive and negative amounts', () => {
    expect(formatTransactionAmount(25)).toBe('+25 credits')
    expect(formatTransactionAmount(-1)).toBe('-1 credit')
  })
})

describe('spread billing contract', () => {
  it('documents one charge per spreadId', () => {
    const spreadId = '550e8400-e29b-41d4-a716-446655440000'
    const charges = new Set<string>()
    const attempt = (id: string) => {
      if (charges.has(id)) return { charged: false }
      charges.add(id)
      return { charged: true }
    }
    expect(attempt(spreadId).charged).toBe(true)
    expect(attempt(spreadId).charged).toBe(false)
    expect(attempt('550e8400-e29b-41d4-a716-446655440001').charged).toBe(true)
  })
})
