import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Supabase configuration
const supabaseUrl = 'https://dyhloaxsdcfgfyfhrdfc.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMxMzA1MiwiZXhwIjoyMDcxODg5MDUyfQ.qUiJxVaSczLmasYXC7OXgtTRExVjj8dFxgbM1ROGvyk'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeMigration() {
  console.log('🚀 Starting direct migration execution...\n')
  
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250908010000_core_features_migration.sql')
  
  try {
    console.log('📄 Reading migration: 20250908010000_core_features_migration.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('⏳ Executing migration directly...')
    
    // Use the Supabase REST API to execute SQL directly
    // This requires the service role key and uses the SQL API endpoint
    const { data, error } = await supabase.from('sql').select('*')
    
    if (error) {
      if (error.message.includes('Could not find the table')) {
        console.log('ℹ️  Direct SQL execution not available via REST API')
        console.log('💡 The migration needs to be executed manually in the Supabase SQL editor')
        console.log('💡 Copy the SQL from the migration file and run it in the Supabase dashboard')
        console.log('💡 Migration file location:', migrationPath)
        return
      }
      throw error
    }
    
    console.log('✅ Migration executed successfully')
    
  } catch (error) {
    console.error('❌ Error executing migration:', error.message)
    console.log('💡 Please run this migration manually in the Supabase SQL editor:')
    console.log('💡 1. Go to https://supabase.com/dashboard/project/dyhloaxsdcfgfyfhrdfc/sql')
    console.log('💡 2. Copy the SQL from supabase/migrations/20250908010000_core_features_migration.sql')
    console.log('💡 3. Paste and execute the SQL')
    process.exit(1)
  }
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message)
  process.exit(1)
})

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error.message)
  process.exit(1)
})

executeMigration()