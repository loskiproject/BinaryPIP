import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xggjgegiuqhyqapcfdto.supabase.co'
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_RcFWyVMX1RtO66eVAMqNgw_tGyHvyUu'

export const supabaseUrl = rawUrl
export const supabaseKey = rawKey

export const supabaseConfigured = true

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})