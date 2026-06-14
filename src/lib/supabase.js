
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tuvqgcosbweljslbfgqc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1dnFnY29zYndlbGpzbGJmZ3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTkyNTgsImV4cCI6MjA4NjIzNTI1OH0._doWGRcUdRamCyd4i9YJd8vwZEGtfX5hwsAHtb1zKZo'

export const supabase = createClient(supabaseUrl, supabaseKey)

const BASE = 'https://tuvqgcosbweljslbfgqc.supabase.co/storage/v1/object/public'

// user profile photos (team-avatars bucket)
export const AVATAR_BASE = `${BASE}/team-avatars/`

// cricket player photos (player-photos bucket)
export const PLAYER_BASE = `${BASE}/player-photos/`

// team logos/flags (team-logos bucket)
export const TEAM_LOGO_BASE = `${BASE}/team-logos/`

