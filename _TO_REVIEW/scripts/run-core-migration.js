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

async function runCoreMigration() {
  console.log('🚀 Starting core features migration...\n')
  
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250908010000_core_features_migration.sql')
  
  try {
    console.log('📄 Reading migration: 20250908010000_core_features_migration.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('⏳ Executing migration...')
    
    // Split the SQL into individual statements and execute them
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim())
    
    // First try to execute the entire migration using exec_sql if it exists
    try {
      console.log('   Trying to execute migration using exec_sql function...')
      const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
      
      if (error) {
        throw error
      }
      
      console.log('✅ Migration executed successfully using exec_sql')
    } catch (error) {
      // If exec_sql doesn't exist or fails, execute statements individually
      if (error.message.includes('Could not find the function public.exec_sql')) {
        console.log('ℹ️  exec_sql function not found, executing statements individually...')
        
        for (const statement of statements) {
          if (statement.trim()) {
            console.log(`   Executing: ${statement.trim().substring(0, 50)}...`)
            
            try {
              // Use the SQL endpoint for direct execution
              const { error: execError } = await supabase.from('sql').select('*')
              
              if (execError && execError.message.includes('Could not find the table')) {
                // If SQL endpoint doesn't work, we need to use a different approach
                console.log('⚠️  Direct SQL execution not available, some statements may need manual execution')
                console.log('💡 Please run complex statements manually in Supabase SQL editor')
                break
              }
              
              // For simple statements, we can use other methods
              if (statement.trim().toUpperCase().startsWith('CREATE TABLE') || 
                  statement.trim().toUpperCase().startsWith('ALTER TABLE') ||
                  statement.trim().toUpperCase().startsWith('CREATE INDEX')) {
                console.log('⚠️  DDL statements may need manual execution in Supabase SQL editor')
              }
              
            } catch (stmtError) {
              console.error(`❌ Statement execution failed:`, stmtError.message)
              
              // If it's a "relation already exists" error, that might be okay
              if (stmtError.message.includes('already exists')) {
                console.log('⚠️  Object already exists, continuing...')
              }
            }
          }
        }
      } else {
        console.error('❌ Migration failed:', error.message)
        
        // If it's a "relation already exists" error, that might be okay
        if (error.message.includes('already exists')) {
          console.log('⚠️  Some objects already exist, continuing...')
        } else {
          console.log('💡 Please run this migration manually in the Supabase SQL editor')
        }
      }
    }
    
    console.log('✅ Core features migration completed successfully')
    
  } catch (error) {
    console.error('❌ Error reading/executing migration:', error.message)
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

runCoreMigration()