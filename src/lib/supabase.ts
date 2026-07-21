import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseEnabled = Boolean(url && anonKey)

// Undefined until Juan creates the Supabase project and fills .env.local —
// sync features stay off (supabaseEnabled === false) until then, the local-first
// app keeps working exactly as before.
export const supabase = supabaseEnabled ? createClient(url, anonKey) : null
