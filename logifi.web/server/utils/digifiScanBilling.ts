import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/database'
import {
  consumeCreditForSpread,
  linkSpreadChargeToScanSession,
  type ConsumeCreditForSpreadResult,
} from './creditsBalance'

type ServiceClient = SupabaseClient<Database>

export interface FinalizeDigifiScanBillingInput {
  spreadId: string
  layout: 'single' | 'two-page'
  scanId: string
  insertError: { message: string } | null
  fallbackBalance: number
}

/**
 * Charge at most once per spread, only after scan results are persisted.
 */
export async function finalizeDigifiScanBilling(
  service: ServiceClient,
  userId: string,
  input: FinalizeDigifiScanBillingInput
): Promise<ConsumeCreditForSpreadResult> {
  if (input.insertError) {
    return {
      ok: true,
      charged: false,
      balance: input.fallbackBalance,
    }
  }

  const creditResult = await consumeCreditForSpread(service, userId, {
    spreadId: input.spreadId,
    layout: input.layout,
  })

  if (creditResult.charged) {
    await linkSpreadChargeToScanSession(service, userId, input.spreadId, input.scanId)
  }

  return creditResult
}
