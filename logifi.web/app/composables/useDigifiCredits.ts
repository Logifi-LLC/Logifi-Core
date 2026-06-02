import { ref, computed, watch } from 'vue'
import type { PaymentMethod } from '~/utils/creditsPricing'
import {
  calculateTotalDollars,
  isPurchaseValid,
  minPagesForMethod,
  rateDollarsForMethod,
} from '~/utils/creditsPricing'
import { useAuth } from '~/composables/useAuth'

export type CreditsBalanceResponse = { credits: number }

export type CreditTransactionType = 'purchase' | 'scan' | 'admin' | 'refund'

export interface CreditTransaction {
  id: string
  amount: number
  balance_after: number
  type: CreditTransactionType
  description: string | null
  spread_id: string | null
  payment_method: string | null
  reference_id: string | null
  created_at: string
}

export type CreditTransactionsResponse = {
  transactions: CreditTransaction[]
}

export type AddMockCreditsResponse = {
  credits: number
  numberOfCredits: number
  paymentMethod: PaymentMethod
  totalCents: number
  totalDollars: number
  rateCentsPerPage: number
}

const credits = ref<number | null>(null)
const transactions = ref<CreditTransaction[]>([])
const transactionsLoading = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

export function useDigifiCredits() {
  const { isAuthenticated, getAccessToken, user } = useAuth()

  function authHeaders(): Record<string, string> {
    const token = getAccessToken()
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
  }

  async function fetchBalance(): Promise<number | null> {
    if (!isAuthenticated.value) {
      credits.value = null
      return null
    }

    loading.value = true
    error.value = null
    try {
      const result = await $fetch<CreditsBalanceResponse>('/api/credits/balance', {
        method: 'GET',
        headers: authHeaders(),
      })
      credits.value = result.credits
      return result.credits
    } catch (err: unknown) {
      const message =
        (err as { data?: { statusMessage?: string } })?.data?.statusMessage ??
        (err instanceof Error ? err.message : 'Failed to load credits')
      error.value = message
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchTransactions(limit = 20): Promise<CreditTransaction[]> {
    if (!isAuthenticated.value) {
      transactions.value = []
      return []
    }

    transactionsLoading.value = true
    try {
      const result = await $fetch<CreditTransactionsResponse>('/api/credits/transactions', {
        method: 'GET',
        headers: authHeaders(),
        query: { limit: String(limit) },
      })
      transactions.value = result.transactions
      return result.transactions
    } catch {
      transactions.value = []
      return []
    } finally {
      transactionsLoading.value = false
    }
  }

  function formatTransactionLabel(tx: CreditTransaction): string {
    if (tx.description?.trim()) return tx.description.trim()
    if (tx.type === 'purchase') return 'Credit purchase'
    if (tx.type === 'scan') return 'Digifi spread scan'
    return tx.type
  }

  function formatTransactionAmount(tx: CreditTransaction): string {
    const prefix = tx.amount > 0 ? '+' : ''
    return `${prefix}${tx.amount} credit${Math.abs(tx.amount) === 1 ? '' : 's'}`
  }

  async function purchaseCredits(input: {
    numberOfCredits: number
    paymentMethod: PaymentMethod
  }): Promise<AddMockCreditsResponse> {
    if (!isAuthenticated.value) {
      throw new Error('Sign in to purchase credits')
    }

    loading.value = true
    error.value = null
    try {
      const result = await $fetch<AddMockCreditsResponse>('/api/credits/add-mock', {
        method: 'POST',
        headers: authHeaders(),
        body: {
          numberOfCredits: input.numberOfCredits,
          paymentMethod: input.paymentMethod,
        },
      })
      credits.value = result.credits
      void fetchTransactions()
      return result
    } catch (err: unknown) {
      const message =
        (err as { data?: { statusMessage?: string } })?.data?.statusMessage ??
        (err instanceof Error ? err.message : 'Purchase failed')
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  function setCreditsFromScan(balance: number | undefined) {
    if (typeof balance === 'number' && Number.isFinite(balance)) {
      credits.value = balance
    }
  }

  watch(
    () => user.value?.id,
    (id) => {
      if (id) {
        void fetchBalance()
      } else {
        credits.value = null
        transactions.value = []
        error.value = null
      }
    },
    { immediate: true }
  )

  const displayCredits = computed(() =>
    credits.value === null ? '—' : String(credits.value)
  )

  return {
    credits,
    transactions,
    transactionsLoading,
    displayCredits,
    loading,
    error,
    fetchBalance,
    fetchTransactions,
    formatTransactionLabel,
    formatTransactionAmount,
    purchaseCredits,
    setCreditsFromScan,
    isPurchaseValid,
    calculateTotalDollars,
    minPagesForMethod,
    rateDollarsForMethod,
  }
}
