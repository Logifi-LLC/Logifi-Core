export const useSupabaseTest = async () => {
  const { supabase } = await import('~/lib/supabase')
  
  try {
    // Test connection by querying a simple table
    const { data, error } = await supabase
      .from('log_entries')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Supabase connection error:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Supabase connected successfully!')
    return { success: true, data }
  } catch (err) {
    console.error('❌ Supabase test failed:', err)
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }
  }
}

