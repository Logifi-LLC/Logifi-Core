import { createClient } from '@supabase/supabase-js'
import { getHeader } from 'h3'
import type { H3Event } from 'h3'
import type { Database } from '../../app/types/database'

/**
 * Build a Supabase client for the current request using the user's JWT.
 * RLS will apply as the authenticated user. Use in server API routes only.
 */
export function getSupabaseClient(event: H3Event) {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl as string
  const anonKey = config.public.supabaseAnonKey as string
  const authHeader = getHeader(event, 'Authorization')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : ''

  return createClient<Database>(url, anonKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  })
}

/**
 * Validate the request's Supabase JWT and return the user id, or null if unauthenticated.
 * Use in FC View API routes to ensure the user is logged in.
 */
export async function getUserIdFromEvent(event: H3Event): Promise<string | null> {
  const supabase = getSupabaseClient(event)
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}
