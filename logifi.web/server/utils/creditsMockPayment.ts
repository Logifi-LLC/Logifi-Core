import type { PaymentMethod } from './creditsPricing'
import { calculatePurchaseTotal } from './creditsPricing'

export type MockPaymentInput = {
  paymentMethod: PaymentMethod
  numberOfCredits: number
}

export type MockPaymentResult = {
  success: true
  totalCents: number
  paymentMethod: PaymentMethod
}

function mockPaymentDelayMs(): number {
  return 1000 + Math.floor(Math.random() * 1001)
}

/**
 * Placeholder payment processor until Stripe / Lightning are integrated.
 */
export async function processMockPayment(
  input: MockPaymentInput
): Promise<MockPaymentResult> {
  const pricing = calculatePurchaseTotal(input.paymentMethod, input.numberOfCredits)
  if (!pricing.valid) {
    throw new Error(pricing.error ?? 'Invalid purchase')
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, mockPaymentDelayMs())
  })

  if (input.paymentMethod === 'stripe') {
    // TODO: Stripe Checkout Session — create session, confirm payment, webhook credit grant
  } else {
    // TODO: Bitcoin Lightning — create invoice, wait for settlement, credit grant
  }

  return {
    success: true,
    totalCents: pricing.totalCents,
    paymentMethod: input.paymentMethod,
  }
}
