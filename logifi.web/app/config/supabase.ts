// Supabase configuration
// Uses Nuxt's runtimeConfig to read from .env file
// With ssr: false, runtimeConfig is the proper way to access env vars

// Get config from runtimeConfig (Nuxt's way - reads from .env automatically)
// This must be called lazily (not at module load time) to work with Nuxt's context
export function getSupabaseConfig() {
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

