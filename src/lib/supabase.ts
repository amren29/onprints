// Legacy re-export — existing API routes import { supabase } from '@/lib/supabase'
// New code should import from '@/lib/supabase/admin', '@/lib/supabase/server', or '@/lib/supabase/client'
export { supabaseAdmin as supabase } from './supabase/admin'
