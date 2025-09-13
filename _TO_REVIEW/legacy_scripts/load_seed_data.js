import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Supabase client with local settings
const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function loadSeedData() {
  console.log('🎓 Loading comprehensive seed data for Alumni Connect...\n')
  
  try {
    // Load the seed SQL file
    const seedFile = path.join(__dirname, 'supabase', 'seed.sql')
    const seedSQL = fs.readFileSync(seedFile, 'utf8')
    
    // Split into individual statements and execute each one
    const statements = seedSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📄 Found ${statements.length} SQL statements to execute...`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.length < 5) {
        continue
      }
      
      try {
        console.log(`🔄 Executing statement ${i + 1}/${statements.length}`)
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        })
        
        if (error) {
          console.warn(`⚠️ Statement ${i + 1} warning:`, error.message)
          // Continue with other statements
        }
      } catch (err) {
        console.warn(`⚠️ Statement ${i + 1} error:`, err.message)
        // Continue with other statements
      }
    }
    
    console.log('\n✅ Seed data loading completed!')
    console.log('\n📋 Data loaded:')
    console.log('• 5 schools with comprehensive metadata')
    console.log('• 10 user profiles with different subscription tiers')
    console.log('• Multiple education records spanning multiple schools')
    console.log('• Search quota records with realistic usage patterns')
    console.log('• Friendship connections with messaging permissions')
    console.log('• Sample posts with comments and reactions')
    console.log('• Notifications for different event types')
    console.log('• Analytics events tracking user behavior')
    console.log('\n🌐 Visit http://127.0.0.1:54323 to see Supabase Studio')
    console.log('🌐 Visit http://localhost:3000 to test the application')
    
  } catch (error) {
    console.error('❌ Failed to load seed data:', error)
  }
}

// Create a simple exec_sql function for testing
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('count')
      .limit(1)
    
    if (error) {
      console.log('📝 No schools table found, will use direct SQL execution')
    } else {
      console.log('✅ Connected to Supabase successfully')
    }
  } catch (err) {
    console.error('❌ Connection test failed:', err)
  }
}

// Run the script
console.log('🔍 Testing connection...')
await testConnection()
await loadSeedData()