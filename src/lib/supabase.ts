import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zudpzwatgdmswivbfuvr.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_pT_YrUw5o7iaXMVNfNYByw_Gz09Qbs-'

export const supabase = createClient(supabaseUrl, supabaseKey)
