import { ref, computed } from 'vue'
import { NativePurchases, type PurchaseResult, PURCHASE_TYPE } from '@capgo/native-purchases'
import { IAP_PRODUCTS, getIapProduct } from '~/utils/iapProducts'
import { isIosApp } from '~/utils/platform'
import { useAuth } from '~/composables/useAuth'
import { apiFetch } from '~/utils/apiFetch'

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
      // Initialize the plugin
      await NativePurchases.initialize({
        products: IAP_PRODUCTS.map((p) => ({
          id: p.productId,
          type: PURCHASE_TYPE.INAPP,
        })),
      })

      // Fetch product details from App Store
      const result = await NativePurchases.getProducts({
        productIdentifiers: IAP_PRODUCTS.map((p) => p.productId),
      })

      // Map App Store product details to our product list
      products.value = IAP_PRODUCTS.map((p) => {
        const storeProduct = result.products?.find((sp) => sp.identifier === p.productId)
        return {
          productId: p.productId,
          credits: p.credits,
          label: p.label,
          price: storeProduct?.price,
          priceValue: storeProduct?.priceValue,
          currency: storeProduct?.currency,
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
      // Initiate purchase with Apple
      const purchaseResult: PurchaseResult = await NativePurchases.purchaseProduct({
        productIdentifier: productId,
        productType: PURCHASE_TYPE.INAPP,
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
