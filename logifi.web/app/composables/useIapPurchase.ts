import { ref, computed } from 'vue'
import { IAP_PRODUCTS, getIapProduct } from '~/utils/iapProducts'
import { isIosApp } from '~/utils/platform'
import { useAuth } from '~/composables/useAuth'
import { apiFetch } from '~/utils/apiFetch'

// Types for the dynamically imported module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PurchaseResult = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NativePurchasesType = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PurchaseTypeEnum = any

let nativePurchasesModule: {
  NativePurchases: NativePurchasesType
  PURCHASE_TYPE: PurchaseTypeEnum
} | null = null

/**
 * Lazy-load the native purchases plugin only when needed on iOS.
 * Uses Capacitor's registerPlugin for reliable native module loading.
 */
async function loadNativePurchases() {
  if (nativePurchasesModule) return nativePurchasesModule
  if (!isIosApp()) {
    throw new Error('Native purchases not available on this platform')
  }
  try {
    // On iOS native: use Capacitor registerPlugin to load the native bridge
    const { registerPlugin } = await import('@capacitor/core')
    const NativePurchases = registerPlugin<NativePurchasesType>('NativePurchases')
    
    // PURCHASE_TYPE enum values from @capgo/native-purchases v8.x
    const PURCHASE_TYPE = {
      INAPP: 'inapp',
      SUBS: 'subs',
    }
    
    nativePurchasesModule = { NativePurchases, PURCHASE_TYPE }
    return nativePurchasesModule
  } catch (err) {
    console.error('[iap] Failed to load native purchases module:', err)
    throw new Error('Failed to load native purchases module')
  }
}

export interface IapProductWithPrice {
  productId: string
  credits: number
  label: string
  price?: string
  priceValue?: number
  currency?: string
  available: boolean
}

export interface IapPurchaseResponse {
  ok: true
  credits: number
  granted: boolean
}

const products = ref<IapProductWithPrice[]>([])
const loading = ref(false)
const initialized = ref(false)
const error = ref<string | null>(null)

/**
 * Composable for iOS In-App Purchases of Digifi credits via StoreKit
 */
export function useIapPurchase() {
  const { isAuthenticated, getAccessToken } = useAuth()

  const isAvailable = computed(() => isIosApp())

  /**
   * Initialize the IAP plugin and load product prices from App Store
   */
  async function initialize(): Promise<void> {
    if (!isAvailable.value) {
      error.value = 'IAP not available on this platform'
      return
    }

    if (initialized.value) return

    loading.value = true
    error.value = null

    try {
      // Lazy-load the native module
      const { NativePurchases, PURCHASE_TYPE } = await loadNativePurchases()

      // Fetch product details from App Store
      // Note: Capgo v8.x has NO initialize() method - just call getProducts directly
      const result = await NativePurchases.getProducts({
        productIdentifiers: IAP_PRODUCTS.map((p) => p.productId),
        productType: PURCHASE_TYPE.INAPP,
      })

      // Map App Store product details to our product list
      // Capgo Product fields: identifier, priceString (formatted), price (number), currencyCode
      products.value = IAP_PRODUCTS.map((p) => {
        const storeProduct = result.products?.find((sp) => sp.identifier === p.productId)
        return {
          productId: p.productId,
          credits: p.credits,
          label: p.label,
          price: storeProduct?.priceString,
          priceValue: storeProduct?.price,
          currency: storeProduct?.currencyCode,
          available: Boolean(storeProduct),
        }
      })

      initialized.value = true
    } catch (err: unknown) {
      console.error('[iap] initialization failed:', err)
      error.value = err instanceof Error ? err.message : 'IAP initialization failed'
      products.value = IAP_PRODUCTS.map((p) => ({
        ...p,
        available: false,
      }))
    } finally {
      loading.value = false
    }
  }

  /**
   * Purchase a product by ID and verify receipt on server
   */
  async function purchaseProduct(productId: string): Promise<IapPurchaseResponse> {
    if (!isAuthenticated.value) {
      throw new Error('Sign in required to purchase credits')
    }

    if (!isAvailable.value) {
      throw new Error('IAP not available on this platform')
    }

    if (!initialized.value) {
      await initialize()
    }

    const product = getIapProduct(productId)
    if (!product) {
      throw new Error(`Unknown product: ${productId}`)
    }

    loading.value = true
    error.value = null

    try {
      // Lazy-load the native module
      const { NativePurchases, PURCHASE_TYPE } = await loadNativePurchases()

      // Initiate purchase with Apple
      // Credits are consumable (user can buy multiple times)
      const purchaseResult: PurchaseResult = await NativePurchases.purchaseProduct({
        productIdentifier: productId,
        productType: PURCHASE_TYPE.INAPP,
        isConsumable: true,
      })

      if (!purchaseResult.transaction) {
        throw new Error('Purchase did not return a transaction')
      }

      const transaction = purchaseResult.transaction

      // Verify receipt on server and credit account
      const token = getAccessToken()
      if (!token) {
        throw new Error('Authentication token not available')
      }

      const verifyResponse = await apiFetch<IapPurchaseResponse>(
        '/api/credits/iap/verify',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: {
            productId: transaction.productIdentifier,
            transactionId: transaction.transactionIdentifier,
            receipt: transaction.receipt,
            jwsRepresentation: transaction.jwsRepresentation,
          },
        }
      )

      return verifyResponse
    } catch (err: unknown) {
      const message =
        (err as { data?: { statusMessage?: string } })?.data?.statusMessage ??
        (err instanceof Error ? err.message : 'Purchase failed')
      error.value = message
      throw new Error(message)
    } finally {
      loading.value = false
    }
  }

  /**
   * Restore previous purchases (required by App Store guidelines)
   */
  async function restorePurchases(): Promise<void> {
    if (!isAvailable.value) {
      throw new Error('IAP not available on this platform')
    }

    if (!initialized.value) {
      await initialize()
    }

    loading.value = true
    error.value = null

    try {
      // Lazy-load the native module
      const { NativePurchases } = await loadNativePurchases()

      await NativePurchases.restorePurchases()
      // Note: consumable products like credits typically cannot be restored,
      // but this is required by App Store guidelines for other product types
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Restore failed'
      error.value = message
      throw new Error(message)
    } finally {
      loading.value = false
    }
  }

  return {
    isAvailable,
    initialized,
    loading,
    error,
    products,
    initialize,
    purchaseProduct,
    restorePurchases,
  }
}
