import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_OS_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_OS_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase OS environment variables. Please check your .env file.')
}

// Client for general use (frontend and backend)
export const supabaseOs = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side actions requiring elevated privileges (e.g., bypassing RLS)
export const getSupabaseAdmin = () => {
  const serviceRoleKey = process.env.SUPABASE_OS_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_OS_SERVICE_ROLE_KEY for admin operations.')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}