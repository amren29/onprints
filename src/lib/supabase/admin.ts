import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS. Use only in server-side code.
// Lazy-initialized to avoid errors when env vars aren't available at build time.
let _admin: SupabaseClient | null = null

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_admin) {
      _admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
    }
    return (_admin as any)[prop]
  },
})
