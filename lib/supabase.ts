import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create client only if both URL and key are provided
let supabase: SupabaseClient | null = null

if (supabaseUrl && supabaseAnonKey) {
  // Fix SSL certificate validation issue on Windows/Node.js
  const fetch = (url: string, options?: any) => {
    // @ts-ignore
    if (typeof global !== 'undefined' && global.fetch) {
      // @ts-ignore
      return global.fetch(url, options)
    }
    // Fallback for environments without global fetch
    return Promise.reject(new Error('Fetch not available'))
  }

  // Create the Supabase client with standard configuration
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
  })
} else {
  // Create a dummy client for build time that will fail gracefully at runtime
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key')
}

/** Server-only: use service role key to bypass RLS (e.g. delete restaurant, unlink users). Set SUPABASE_SERVICE_ROLE_KEY in .env. */
function getServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export { supabase, getServiceRoleClient }

