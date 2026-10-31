import { createClient } from '@supabase/supabase-js'

// Публичные значения (publishable key специально предназначен для фронтенда; доступ защищён RLS).
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://iiaqpkynritnvcwjhooh.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_g-RDmNvLitjDhoKF3CSTHQ_7Ke_sQVH'

export const supabase = createClient(url, key)
