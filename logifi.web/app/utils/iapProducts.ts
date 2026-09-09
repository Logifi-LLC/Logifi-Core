/**
 * iOS In-App Purchase product definitions for Digifi credits.
 * These product IDs must be created in App Store Connect before use.
 */

export interface IapProduct {
  /** Product ID as registered in App Store Connect */
  productId: string
  /** Number of Digifi credits included */
  credits: number
  /** Display label for UI */
  label: string
}

/**
 * Fixed consumable credit packs for iOS IAP.
 * Product IDs follow pattern: io.logifi.app.credits.{count}
 */
export const IAP_PRODUCTS: readonly IapProduct[] = [
  {
    productId: 'io.logifi.app.credits.25',
    credits: 25,
    label: '25 credits',
  },
  {
    productId: 'io.logifi.app.credits.50',
    credits: 50,
    label: '50 credits',
  },
  {
    productId: 'io.logifi.app.credits.100',
    credits: 100,
    label: '100 credits',
  },
  {
    productId: 'io.logifi.app.credits.250',
    credits: 250,
    label: '250 credits',
  },
  {
    productId: 'io.logifi.app.credits.500',
    credits: 500,
    label: '500 credits',
  },
] as const

/**
 * Get IAP product by ID
 */
export function getIapProduct(productId: string): IapProduct | undefined {
  return IAP_PRODUCTS.find((p) => p.productId === productId)
}

/**
 * Get IAP product by credit count (exact match)
 */
export function getIapProductByCredits(credits: number): IapProduct | undefined {
  return IAP_PRODUCTS.find((p) => p.credits === credits)
}
