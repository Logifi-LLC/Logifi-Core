export type PaymentMethod = 'stripe' | 'lightning'

export const STRIPE_RATE_CENTS = 40
export const LIGHTNING_RATE_CENTS = 30
export const STRIPE_MIN_PAGES = 25
export const LIGHTNING_MIN_PAGES = 1
export const MAX_CREDITS_PER_PURCHASE = 10_000

export function rateCentsForMethod(paymentMethod: PaymentMethod): number {
  return paymentMethod === 'stripe' ? STRIPE_RATE_CENTS : LIGHTNING_RATE_CENTS
}

export function minPagesForMethod(paymentMethod: PaymentMethod): number {
  return paymentMethod === 'stripe' ? STRIPE_MIN_PAGES : LIGHTNING_MIN_PAGES
}

export function validatePurchase(
  paymentMethod: PaymentMethod,
  numberOfCredits: number
): { valid: true } | { valid: false; error: string } {
  if (!Number.isInteger(numberOfCredits) || numberOfCredits < 1) {
    return { valid: false, error: 'numberOfCredits must be a positive integer' }
  }
  if (numberOfCredits > MAX_CREDITS_PER_PURCHASE) {
    return {
      valid: false,
      error: `Maximum purchase is ${MAX_CREDITS_PER_PURCHASE} pages per transaction`,
    }
  }
  const min = minPagesForMethod(paymentMethod)
  if (numberOfCredits < min) {
    const label = paymentMethod === 'stripe' ? 'Credit card' : 'Lightning'
    return {
      valid: false,
      error: `${label} purchases require at least ${min} pages`,
    }
  }
  return { valid: true }
}

export function calculatePurchaseTotal(
  paymentMethod: PaymentMethod,
  numberOfCredits: number
): {
  valid: boolean
  totalCents: number
  rateCentsPerPage: number
  error?: string
} {
  const validation = validatePurchase(paymentMethod, numberOfCredits)
  if (!validation.valid) {
    return {
      valid: false,
      totalCents: 0,
      rateCentsPerPage: rateCentsForMethod(paymentMethod),
      error: validation.error,
    }
  }
  const rateCentsPerPage = rateCentsForMethod(paymentMethod)
  return {
    valid: true,
    totalCents: numberOfCredits * rateCentsPerPage,
    rateCentsPerPage,
  }
}

export function totalDollarsFromCents(totalCents: number): number {
  return totalCents / 100
}
