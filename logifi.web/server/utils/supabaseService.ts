import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/database'

const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const pick = (...candidates: unknown[]) => {
  for (const c of candidates) {
    const s = clean(c)
    if (s) return s
  }
  return ''
}

/** Service-role Supabase client for server-only storage and privileged writes. */
export function getSupabaseServiceClient() {
  const config = useRuntimeConfig()
  const url = pick(config.public.supabaseUrl)
  const serviceRoleKey = pick(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY,
    config.supabaseServiceRoleKey
  )
  if (!url || !serviceRoleKey) {
    return null
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
