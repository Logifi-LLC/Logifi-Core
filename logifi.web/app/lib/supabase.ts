import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'
import { supabaseConfig } from '~/config/supabase'

// Get config from our config file
const supabaseUrl = supabaseConfig.url
const supabaseAnonKey = supabaseConfig.anonKey

// Debug: Log what we're getting (only in dev)
if (process.dev || (typeof window !== 'undefined' && window.location.hostname === 'localhost')) {
  console.log('🔍 Supabase Config Check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
    keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING',
    configType: typeof useRuntimeConfig !== 'undefined' ? 'runtimeConfig' : 'direct'
  })
}

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = `Missing Supabase environment variables!
  
Please check your .env file in logifi.web/.env

Required (use one of these formats):
- SUPABASE_URL=https://your-project.supabase.co
- NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

- SUPABASE_ANON_KEY=your-anon-key
- NUXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

Current values:
- SUPABASE_URL: ${supabaseUrl ? 'SET' : 'MISSING'}
- SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'SET' : 'MISSING'}

After updating .env, restart your dev server!`
  
  console.error(errorMsg)
  throw new Error(errorMsg)
}

// Validate URL format
if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  throw new Error(`Invalid SUPABASE_URL format! Must start with http:// or https://

Current value: "${supabaseUrl}"

Please update your .env file with a valid URL like:
SUPABASE_URL=https://your-project-id.supabase.co`)
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)

// Helper to check if Supabase is available (for offline support)
export const isSupabaseAvailable = () => {
  return typeof window !== 'undefined' && 
         supabaseUrl && 
         supabaseAnonKey
}

