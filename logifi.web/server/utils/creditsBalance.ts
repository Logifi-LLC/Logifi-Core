import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/database'

type ServiceClient = SupabaseClient<Database>

export type CreditTransactionType = 'purchase' | 'scan' | 'admin' | 'refund'

export interface CreditTransactionRow {
  id: string
  user_id: string
  amount: number
  balance_after: number
  type: CreditTransactionType
  description: string | null
  spread_id: string | null
  payment_method: string | null
  reference_id: string | null
  created_at: string
}

export interface ConsumeCreditForSpreadInput {
  spreadId: string
  layout: 'single' | 'two-page'
}

export interface ConsumeCreditForSpreadResult {
  ok: boolean
  charged: boolean
  balance: number
}

export interface AddCreditsOptions {
  description?: string
  paymentMethod?: string
  referenceId?: string
}

async function ensureUserProfile(service: ServiceClient, userId: string): Promise<void> {
  const { error } = await service.from('user_profiles').upsert(
    { id: userId },
    { onConflict: 'id', ignoreDuplicates: true }
  )
  if (error) {
    throw new Error(`Failed to ensure user profile: ${error.message}`)
  }
}

async function insertCreditTransaction(
  service: ServiceClient,
  row: {
    userId: string
    amount: number
    balanceAfter: number
    type: CreditTransactionType
    description?: string
    spreadId?: string
    paymentMethod?: string
    referenceId?: string
  }
): Promise<void> {
  const { error } = await service.from('credit_transactions').insert({
    user_id: row.userId,
    amount: row.amount,
    balance_after: row.balanceAfter,
    type: row.type,
    description: row.description ?? null,
    spread_id: row.spreadId ?? null,
    payment_method: row.paymentMethod ?? null,
    reference_id: row.referenceId ?? null,
  })
  if (error) {
    console.error('[credits] failed to insert transaction:', error.message)
  }
}

export async function getCreditsBalance(
  service: ServiceClient,
  userId: string
): Promise<number> {
  const { data, error } = await service
    .from('user_profiles')
    .select('credits')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to read credits: ${error.message}`)
  }

  return data?.credits ?? 0
}

export async function listCreditTransactions(
  service: ServiceClient,
  userId: string,
  limit = 20
): Promise<CreditTransactionRow[]> {
  const safeLimit = Math.min(Math.max(1, limit), 100)
  const { data, error } = await service
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    throw new Error(`Failed to list credit transactions: ${error.message}`)
  }

  return (data ?? []) as CreditTransactionRow[]
}

export async function addCredits(
  service: ServiceClient,
  userId: string,
  amount: number,
  options: AddCreditsOptions = {}
): Promise<number> {
  if (!Number.isInteger(amount) || amount < 1) {
    throw new Error('amount must be a positive integer')
  }

  await ensureUserProfile(service, userId)
  const current = await getCreditsBalance(service, userId)
  const next = current + amount

  const { data, error } = await service
    .from('user_profiles')
    .update({ credits: next, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('credits')
    .single()

  if (error) {
    throw new Error(`Failed to add credits: ${error.message}`)
  }

  await insertCreditTransaction(service, {
    userId,
    amount,
    balanceAfter: data.credits,
    type: 'purchase',
    description: options.description ?? `Added ${amount} credits`,
    paymentMethod: options.paymentMethod,
    referenceId: options.referenceId,
  })

  return data.credits
}

/** @deprecated Use consumeCreditForSpread for Digifi scans. */
export async function consumeCredit(
  service: ServiceClient,
  userId: string
): Promise<{ ok: boolean; balance: number }> {
  await ensureUserProfile(service, userId)
  const current = await getCreditsBalance(service, userId)
  if (current < 1) {
    return { ok: false, balance: current }
  }

  const next = current - 1

  const { data, error } = await service
    .from('user_profiles')
    .update({ credits: next, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('credits')
    .single()

  if (error) {
    throw new Error(`Failed to consume credit: ${error.message}`)
  }

  await insertCreditTransaction(service, {
    userId,
    amount: -1,
    balanceAfter: data.credits,
    type: 'scan',
    description: 'Digifi scan',
  })

  return { ok: true, balance: data.credits }
}

export async function consumeCreditForSpread(
  service: ServiceClient,
  userId: string,
  input: ConsumeCreditForSpreadInput
): Promise<ConsumeCreditForSpreadResult> {
  await ensureUserProfile(service, userId)

  const { data: existing, error: existingError } = await service
    .from('digifi_spread_charges')
    .select('id')
    .eq('user_id', userId)
    .eq('spread_id', input.spreadId)
    .maybeSingle()

  if (existingError) {
    throw new Error(`Failed to check spread charge: ${existingError.message}`)
  }

  const balance = await getCreditsBalance(service, userId)
  if (existing) {
    return { ok: true, charged: false, balance }
  }

  if (balance < 1) {
    return { ok: false, charged: false, balance }
  }

  const next = balance - 1

  const { data: updated, error: updateError } = await service
    .from('user_profiles')
    .update({ credits: next, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('credits')
    .single()

  if (updateError) {
    throw new Error(`Failed to consume credit: ${updateError.message}`)
  }

  const { error: chargeError } = await service.from('digifi_spread_charges').insert({
    user_id: userId,
    spread_id: input.spreadId,
    layout: input.layout,
    credits_charged: 1,
  })

  if (chargeError) {
    // Roll back balance if spread charge row failed (e.g. race on unique constraint)
    await service
      .from('user_profiles')
      .update({ credits: balance, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (chargeError.code === '23505') {
      const retryBalance = await getCreditsBalance(service, userId)
      return { ok: true, charged: false, balance: retryBalance }
    }

    throw new Error(`Failed to record spread charge: ${chargeError.message}`)
  }

  await insertCreditTransaction(service, {
    userId,
    amount: -1,
    balanceAfter: updated.credits,
    type: 'scan',
    description: 'Digifi spread scan',
    spreadId: input.spreadId,
  })

  return { ok: true, charged: true, balance: updated.credits }
}

export async function linkSpreadChargeToScanSession(
  service: ServiceClient,
  userId: string,
  spreadId: string,
  scanSessionId: string
): Promise<void> {
  const { error } = await service
    .from('digifi_spread_charges')
    .update({ first_scan_session_id: scanSessionId })
    .eq('user_id', userId)
    .eq('spread_id', spreadId)
    .is('first_scan_session_id', null)

  if (error) {
    console.error('[credits] failed to link spread charge to scan session:', error.message)
  }
}
