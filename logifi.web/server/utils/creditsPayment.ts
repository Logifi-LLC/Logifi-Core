import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/database'
import { addCredits } from './creditsBalance'

type ServiceClient = SupabaseClient<Database>

export async function hasPurchaseForReference(
  service: ServiceClient,
  referenceId: string
): Promise<boolean> {
  const { data, error } = await service
    .from('credit_transactions')
    .select('id')
    .eq('reference_id', referenceId)
    .eq('type', 'purchase')
    .maybeSingle()

  if (error) {
    console.error('[credits] reference lookup failed:', error.message)
    throw new Error('Could not verify payment reference')
  }

  return Boolean(data)
}

export async function grantCreditsIdempotent(
  service: ServiceClient,
  userId: string,
  numberOfCredits: number,
  options: {
    referenceId: string
    paymentMethod: string
    description?: string
  }
): Promise<{ credits: number; granted: boolean }> {
  if (await hasPurchaseForReference(service, options.referenceId)) {
    const { getCreditsBalance } = await import('./creditsBalance')
    const credits = await getCreditsBalance(service, userId)
    return { credits, granted: false }
  }

  const credits = await addCredits(service, userId, numberOfCredits, {
    description: options.description ?? `Purchased ${numberOfCredits} credits`,
    paymentMethod: options.paymentMethod,
    referenceId: options.referenceId,
  })

  return { credits, granted: true }
}
