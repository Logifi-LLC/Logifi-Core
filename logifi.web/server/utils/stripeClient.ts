import Stripe from 'stripe'
import { getStripeEnv } from './stripeEnv'

let stripeClient: Stripe | null = null

export function getStripeClient(): Stripe | null {
  const { secretKey } = getStripeEnv()
  if (!secretKey) return null

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey)
  }
  return stripeClient
}
