export type PaymentMethod = 'stripe' | 'lightning'

export const STRIPE_RATE_CENTS = 40
export const LIGHTNING_RATE_CENTS = 30
export const STRIPE_MIN_PAGES = 25
export const LIGHTNING_MIN_PAGES = 1

export function rateDollarsForMethod(paymentMethod: PaymentMethod): number {
  return (paymentMethod === 'stripe' ? STRIPE_RATE_CENTS : LIGHTNING_RATE_CENTS) / 100
}

export function minPagesForMethod(paymentMethod: PaymentMethod): number {
  return paymentMethod === 'stripe' ? STRIPE_MIN_PAGES : LIGHTNING_MIN_PAGES
}

export function calculateTotalDollars(
  paymentMethod: PaymentMethod,
  numberOfPages: number
): number {
  return numberOfPages * rateDollarsForMethod(paymentMethod)
}

export function isPurchaseValid(
  paymentMethod: PaymentMethod,
  numberOfPages: number
): boolean {
  if (!Number.isInteger(numberOfPages) || numberOfPages < 1) return false
  return numberOfPages >= minPagesForMethod(paymentMethod)
}
