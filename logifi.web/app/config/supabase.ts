// Supabase configuration
// Uses Nuxt's runtimeConfig to read from .env file
// With ssr: false, runtimeConfig is the proper way to access env vars

// Get config from runtimeConfig (Nuxt's way - reads from .env automatically)
function getSupabaseConfig() {
  const config = useRuntimeConfig()
  const url = config.public?.supabaseUrl
  const anonKey = config.public?.supabaseAnonKey
  
  if (!url || !anonKey) {
    const error = new Error(`Missing Supabase environment variables in runtimeConfig!
    
Please check your .env file in logifi.web/.env

Required:
- NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
- NUXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

Current values:
- supabaseUrl: ${url ? 'SET' : 'MISSING'}
- supabaseAnonKey: ${anonKey ? 'SET' : 'MISSING'}

After updating .env, restart your dev server!`)
    
    if (process.dev) {
      console.error(error.message)
    }
    throw error
  }
  
  return { url, anonKey }
}

// Get config - runtimeConfig is the source of truth for Nuxt 3
export const supabaseConfig = getSupabaseConfig()

// Debug in dev (minimal logging now that it's working)
if (process.dev) {
  console.log('✅ Supabase Config loaded from .env via runtimeConfig')
}

