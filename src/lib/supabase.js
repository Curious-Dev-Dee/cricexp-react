import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tuvqgcosbweljslbfgqc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1dnFnY29zYndlbGpzbGJmZ3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1MjA4NTgsImV4cCI6MjA1NTA5Njg1OH0.6RnzWBbWPwHAxiWCSKAqwSSHVoABFMOg2bN77wXqC_w'

export const supabase = createClient(supabaseUrl, supabaseKey)