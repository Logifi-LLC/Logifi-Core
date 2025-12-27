import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'
import { getSupabaseConfig } from '~/config/supabase'

// Lazy initialization - only get config when supabase client is actually used
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null

function initializeSupabase() {
  if (!supabaseClient) {
    const config = getSupabaseConfig()
    
    // Debug: Log what we're getting (only in dev)
    if (process.dev || (typeof window !== 'undefined' && window.location.hostname === 'localhost')) {
      console.log('🔍 Supabase Config Check:', {
        hasUrl: !!config.url,
        hasKey: !!config.anonKey,
        urlPreview: config.url ? `${config.url.substring(0, 30)}...` : 'MISSING',
        keyPreview: config.anonKey ? `${config.anonKey.substring(0, 20)}...` : 'MISSING',
        configType: 'runtimeConfig'
      })
    }

    // Validate URL format
    if (!config.url.startsWith('http://') && !config.url.startsWith('https://')) {
      throw new Error(`Invalid SUPABASE_URL format! Must start with http:// or https://

Current value: "${config.url}"

Please update your .env file with a valid URL like:
SUPABASE_URL=https://your-project-id.supabase.co`)
    }

    supabaseClient = createClient<Database>(
      config.url,
      config.anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    )
  }
  
  return supabaseClient
}

// Export supabase client with lazy initialization
// This will be initialized the first time it's accessed (which should be in a Nuxt context)
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop) {
    const client = initializeSupabase()
    const value = client[prop as keyof typeof client]
    // If it's a function, bind it to the client
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})

// Helper to check if Supabase is available (for offline support)
export const isSupabaseAvailable = () => {
  if (typeof window === 'undefined') return false
  try {
    const config = getSupabaseConfig()
    return !!config.url && !!config.anonKey
  } catch {
    return false
  }
}

