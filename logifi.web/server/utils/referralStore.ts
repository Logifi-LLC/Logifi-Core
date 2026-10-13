import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/database'
import type { ReferralRewardKind } from '../../shared/referrals'

export type ServiceClient = SupabaseClient<Database>

export interface ReferralStore {
  getCode(userId: string): Promise<string | null>
  saveCode(userId: string, code: string): Promise<'ok' | 'conflict'>
  findUserIdByCode(code: string): Promise<string | null>
  getReferredBy(userId: string): Promise<string | null>
  setReferredBy(userId: string, referrerId: string): Promise<'ok' | 'conflict'>
  hasPaidPurchase(userId: string): Promise<boolean>
  paidPurchaseCount(userId: string): Promise<number>
  referrerRewardCount(referrerId: string): Promise<number>
  hasReward(referredUserId: string, kind: ReferralRewardKind): Promise<boolean>
  claimReward(input: {
    referrerId: string
    referredUserId: string
    kind: ReferralRewardKind
    credits: number
  }): Promise<'ok' | 'duplicate' | 'cap'>
  releaseReward(referredUserId: string, kind: ReferralRewardKind): Promise<void>
}

type PostgrestError = { code?: string; message?: string }

function throwIfError(error: PostgrestError | null): void {
  if (error) throw error
}

function classifyRewardInsert(error: PostgrestError): 'duplicate' | 'cap' | 'throw' {
  if (error.code === '23505') return 'duplicate'
  if (error.code === '23514' && (error.message ?? '').includes('referral_reward_cap')) return 'cap'
  return 'throw'
}

export function referralSchemaMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String((error as { code?: string }).code ?? '') : ''
  const message = 'message' in error ? String((error as { message?: string }).message ?? '') : ''
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    /referral_codes|referral_rewards|relation "referrals"|table 'public.referrals'/.test(message)
  )
}

export function createSupabaseReferralStore(service: ServiceClient): ReferralStore {
  return {
    async getCode(userId) {
      const { data, error } = await service
        .from('referral_codes')
        .select('code')
        .eq('user_id', userId)
        .maybeSingle()
      throwIfError(error)
      return data?.code ?? null
    },

    async saveCode(userId, code) {
      const { error } = await service.from('referral_codes').insert({ user_id: userId, code })
      if (!error) return 'ok'
      if (error.code === '23505') return 'conflict'
      throw error
    },

    async findUserIdByCode(code) {
      const { data, error } = await service
        .from('referral_codes')
        .select('user_id')
        .eq('code', code)
        .maybeSingle()
      throwIfError(error)
      return data?.user_id ?? null
    },

    async getReferredBy(userId) {
      const { data, error } = await service
        .from('referrals')
        .select('referred_by')
        .eq('user_id', userId)
        .maybeSingle()
      throwIfError(error)
      return data?.referred_by ?? null
    },

    async setReferredBy(userId, referrerId) {
      const { error } = await service.from('referrals').insert({
        user_id: userId,
        referred_by: referrerId,
      })
      if (!error) return 'ok'
      if (error.code === '23505') return 'conflict'
      throw error
    },

    async hasPaidPurchase(userId) {
      return (await this.paidPurchaseCount(userId)) > 0
    },

    async paidPurchaseCount(userId) {
      const { count, error } = await service
        .from('credit_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('type', 'purchase')
      throwIfError(error)
      return count ?? 0
    },

    async referrerRewardCount(referrerId) {
      const { count, error } = await service
        .from('referral_rewards')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_user_id', referrerId)
        .eq('kind', 'referrer_bonus')
      throwIfError(error)
      return count ?? 0
    },

    async hasReward(referredUserId, kind) {
      const { data, error } = await service
        .from('referral_rewards')
        .select('id')
        .eq('referred_user_id', referredUserId)
        .eq('kind', kind)
        .maybeSingle()
      throwIfError(error)
      return Boolean(data)
    },

    async claimReward(input) {
      const { error } = await service.from('referral_rewards').insert({
        referrer_user_id: input.referrerId,
        referred_user_id: input.referredUserId,
        kind: input.kind,
        credits: input.credits,
      })
      if (!error) return 'ok'
      const classified = classifyRewardInsert(error)
      if (classified === 'throw') throw error
      return classified
    },

    async releaseReward(referredUserId, kind) {
      const { error } = await service
        .from('referral_rewards')
        .delete()
        .eq('referred_user_id', referredUserId)
        .eq('kind', kind)
      throwIfError(error)
    },
  }
}
