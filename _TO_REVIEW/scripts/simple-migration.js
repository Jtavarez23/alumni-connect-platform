import { createClient } from '@supabase/supabase-js'

// Use your existing public key for now - this will only work for basic operations
const supabaseUrl = 'https://dyhloaxsdcfgfyfhrdfc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMTMwNTIsImV4cCI6MjA3MTg4OTA1Mn0.eg_bc94ySXthS_A8_oIffrrsW4UcSSu5lEKOw89OIz0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabaseState() {
  console.log('🔍 Checking current database state...\n')

  // Check if new tables exist
  const tablesToCheck = [
    'user_education',
    'profile_views', 
    'search_quotas',
    'messaging_permissions',
    'social_connections',
    'classmate_suggestions',
    'activity_feed',
    'group_chats'
  ]

  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        if (error.code === 'PGRST106' || error.message.includes('does not exist')) {
          console.log(`❌ Table '${table}' does not exist - needs migration`)
        } else {
          console.log(`⚠️  Table '${table}' exists but has access issues:`, error.message)
        }
      } else {
        console.log(`✅ Table '${table}' exists and accessible`)
      }
    } catch (err) {
      console.log(`❌ Error checking table '${table}':`, err.message)
    }
  }

  // Check profiles table for new columns
  console.log('\n🔍 Checking profiles table structure...')
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier, profile_views_enabled, all_years_networking')
      .limit(1)

    if (error) {
      console.log('❌ New profile columns not found - needs migration')
    } else {
      console.log('✅ Profile table has new columns')
    }
  } catch (err) {
    console.log('❌ Error checking profile columns:', err.message)
  }
}

checkDatabaseState()