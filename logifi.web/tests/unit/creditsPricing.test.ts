import { describe, it, expect } from 'vitest'
import {
  calculatePurchaseTotal,
  validatePurchase,
  STRIPE_MIN_PAGES,
  LIGHTNING_MIN_PAGES,
} from '../../server/utils/creditsPricing'

describe('validatePurchase', () => {
  it('requires at least 25 pages for stripe', () => {
    expect(validatePurchase('stripe', 24).valid).toBe(false)
    expect(validatePurchase('stripe', 25).valid).toBe(true)
  })

  it('allows 1 page minimum for lightning', () => {
    expect(validatePurchase('lightning', 0).valid).toBe(false)
    expect(validatePurchase('lightning', 1).valid).toBe(true)
  })

  it('rejects non-integer quantities', () => {
    expect(validatePurchase('lightning', 1.5).valid).toBe(false)
  })
})

describe('calculatePurchaseTotal', () => {
  it('computes stripe total at $0.50 per page', () => {
    const result = calculatePurchaseTotal('stripe', 25)
    expect(result.valid).toBe(true)
    expect(result.totalCents).toBe(25 * 50)
    expect(result.rateCentsPerPage).toBe(50)
  })

  it('computes lightning total at $0.40 per page', () => {
    const result = calculatePurchaseTotal('lightning', 10)
    expect(result.valid).toBe(true)
    expect(result.totalCents).toBe(400)
    expect(result.rateCentsPerPage).toBe(40)
  })

  it('returns error when below stripe minimum', () => {
    const result = calculatePurchaseTotal('stripe', STRIPE_MIN_PAGES - 1)
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('returns error when below lightning minimum', () => {
    const result = calculatePurchaseTotal('lightning', LIGHTNING_MIN_PAGES - 1)
    expect(result.valid).toBe(false)
  })
})
