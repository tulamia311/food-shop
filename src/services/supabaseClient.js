import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null

if (supabase) {
  console.info('[Supabase] Client initialized', { url })
} else {
  console.warn('[Supabase] Disabled — missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export function isSupabaseEnabled() {
  return Boolean(supabase)
}
