import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/database'

const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

/** Service-role Supabase client for server-only storage and privileged writes. */
export function getSupabaseServiceClient() {
  const config = useRuntimeConfig()
  const url = clean(config.public.supabaseUrl)
  const serviceRoleKey = clean(
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
