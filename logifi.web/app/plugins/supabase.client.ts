// Client-side plugin to initialize Supabase
// This ensures env vars are loaded properly with ssr: false

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  
  // Log config for debugging
  if (process.dev) {
    console.log('🔌 Supabase Plugin - Config loaded:', {
      hasUrl: !!config.public.supabaseUrl,
      hasKey: !!config.public.supabaseAnonKey,
      url: config.public.supabaseUrl ? config.public.supabaseUrl.substring(0, 30) + '...' : 'MISSING'
    })
  }
  
  return {
    provide: {
      supabaseConfig: {
        url: config.public.supabaseUrl,
        anonKey: config.public.supabaseAnonKey
      }
    }
  }
})

