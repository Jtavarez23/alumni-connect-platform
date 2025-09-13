import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dyhloaxsdcfgfyfhrdfc.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  console.log('💡 You can find this key in your Supabase dashboard under Settings > API')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const migrations = [
  '20250903160000_multi_school_v2_architecture.sql',
  '20250903161000_migrate_existing_data.sql', 
  '20250903162000_add_rpc_functions.sql'
]

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n')

  for (const migration of migrations) {
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', migration)
    
    try {
      console.log(`📄 Reading migration: ${migration}`)
      const migrationSQL = readFileSync(migrationPath, 'utf-8')
      
      console.log(`⏳ Executing migration: ${migration}`)
      const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
      
      if (error) {
        console.error(`❌ Migration ${migration} failed:`, error.message)
        
        // If it's a "relation already exists" error, that might be okay
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Migration ${migration} - Some objects already exist, continuing...`)
        } else {
          process.exit(1)
        }
      } else {
        console.log(`✅ Migration ${migration} completed successfully`)
      }
    } catch (error) {
      console.error(`❌ Error reading/executing migration ${migration}:`, error.message)
      process.exit(1)
    }
    
    console.log('') // Empty line for readability
  }

  console.log('🎉 All migrations completed!')
  console.log('\n📊 Running migration verification...')
  
  // Run verification
  try {
    const { data: verification, error } = await supabase.rpc('verify_migration_v2')
    
    if (error) {
      console.error('❌ Verification failed:', error.message)
    } else if (verification) {
      console.log('\n📋 Migration Verification Results:')
      verification.forEach(result => {
        const status = result.success ? '✅' : '❌'
        console.log(`${status} ${result.check_name}: ${result.status}`)
        console.log(`   Before: ${result.count_before}, After: ${result.count_after}`)
      })
      
      const allSuccessful = verification.every(r => r.success)
      if (allSuccessful) {
        console.log('\n🎉 All verification checks passed!')
        console.log('\n🔧 You can now run cleanup with:')
        console.log('   SELECT cleanup_migration_v2();')
      } else {
        console.log('\n⚠️  Some verification checks failed. Please review before proceeding.')
      }
    }
  } catch (error) {
    console.log('ℹ️  Verification function not available yet, this is normal for fresh installations.')
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

runMigrations()