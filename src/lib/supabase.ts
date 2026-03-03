import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zudpzwatgdmswivbfuvr.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1ZHB6d2F0Z2Rtc3dpdmJmdXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTQzNTksImV4cCI6MjA4ODA3MDM1OX0.-gePh1rVb4vD00PeRpngDSiitGxtVGykpuongQgaRGQ'

export const supabase = createClient(supabaseUrl, supabaseKey)
