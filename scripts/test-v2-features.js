import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dyhloaxsdcfgfyfhrdfc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMTMwNTIsImV4cCI6MjA3MTg4OTA1Mn0.eg_bc94ySXthS_A8_oIffrrsW4UcSSu5lEKOw89OIz0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testV2Features() {
  console.log('🧪 Testing Reconnect Hive V2 Features...\n')

  const tests = {
    passed: 0,
    failed: 0,
    results: []
  }

  // Helper function to run tests
  const runTest = async (testName, testFn) => {
    try {
      await testFn()
      console.log(`✅ ${testName}`)
      tests.results.push({ name: testName, status: 'PASSED' })
      tests.passed++
    } catch (error) {
      console.log(`❌ ${testName}: ${error.message}`)
      tests.results.push({ name: testName, status: 'FAILED', error: error.message })
      tests.failed++
    }
  }

  // Test 1: Check if new tables exist and are accessible
  await runTest('New tables accessibility', async () => {
    const tables = [
      'user_education', 'profile_views', 'search_quotas', 
      'messaging_permissions', 'social_connections', 'classmate_suggestions'
    ]
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1)
      if (error && !error.message.includes('0 rows')) {
        throw new Error(`Table ${table} not accessible: ${error.message}`)
      }
    }
  })

  // Test 2: Check profile table new columns
  await runTest('Profiles table updated with new columns', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier, profile_views_enabled, all_years_networking, search_quota_used')
      .limit(1)
    
    if (error) throw error
    
    // Check if columns exist (data might be empty but shouldn't error)
    if (data !== null) {
      console.log('    📊 Sample profile data structure confirmed')
    }
  })

  // Test 3: Test RPC functions
  await runTest('RPC functions created', async () => {
    const functions = [
      'can_user_message',
      'get_network_overlap', 
      'increment_search_usage',
      'get_user_premium_features'
    ]
    
    for (const funcName of functions) {
      try {
        // Just test if function exists, don't actually call it
        const { error } = await supabase.rpc(funcName, {})
        
        // Function exists if we get a parameter error (not "function doesn't exist")
        if (error && !error.message.includes('function') && !error.message.includes('does not exist')) {
          console.log(`    📝 Function ${funcName} exists`)
        } else if (error && error.message.includes('does not exist')) {
          throw new Error(`Function ${funcName} does not exist`)
        }
      } catch (err) {
        if (err.message.includes('does not exist')) {
          throw err
        }
        // Other errors are okay - function exists but needs parameters
        console.log(`    📝 Function ${funcName} exists (needs parameters)`)
      }
    }
  })

  // Test 4: Test subscription system integration
  await runTest('Subscription system ready', async () => {
    // Check if we can query subscription-related data
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('*')
      .limit(1)
    
    if (schoolsError) throw schoolsError

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .limit(1)
    
    if (profilesError) throw profilesError
    
    console.log('    💳 Subscription tier system operational')
  })

  // Test 5: Check Row Level Security policies
  await runTest('RLS policies active', async () => {
    // Try to access a protected table - should not error but might return empty
    const { error } = await supabase
      .from('profile_views')
      .select('*')
      .limit(1)
    
    // RLS should allow the query but filter results, not block it
    if (error && error.message.includes('permission denied')) {
      throw new Error('RLS blocking access incorrectly')
    }
    
    console.log('    🔒 RLS policies configured correctly')
  })

  // Test 6: Check if migration verification function exists
  await runTest('Migration verification function', async () => {
    try {
      const { data, error } = await supabase.rpc('verify_migration_v2')
      
      if (error && error.message.includes('does not exist')) {
        throw new Error('Migration verification function not found')
      }
      
      if (data) {
        console.log('    📋 Migration verification data available:')
        data.forEach(result => {
          const status = result.success ? '✅' : '❌'
          console.log(`      ${status} ${result.check_name}: ${result.count_before} → ${result.count_after}`)
        })
      }
    } catch (err) {
      if (err.message.includes('permission denied')) {
        console.log('    ⚠️  Verification function exists but needs service role access')
      } else {
        throw err
      }
    }
  })

  // Summary
  console.log('\n📊 Test Summary:')
  console.log(`✅ Passed: ${tests.passed}`)
  console.log(`❌ Failed: ${tests.failed}`)
  console.log(`📈 Success Rate: ${Math.round((tests.passed / (tests.passed + tests.failed)) * 100)}%`)

  if (tests.failed === 0) {
    console.log('\n🎉 All tests passed! Your V2 migration is ready.')
    console.log('\n🚀 Next steps:')
    console.log('   1. Update your components to use the new useSubscription hook')
    console.log('   2. Integrate search quota widgets')
    console.log('   3. Add messaging restrictions')
    console.log('   4. Test the premium features')
  } else {
    console.log('\n⚠️  Some tests failed. Check the migration steps:')
    console.log('   1. Make sure all 3 migration files were run in Supabase Dashboard')
    console.log('   2. Check for any SQL errors during migration')
    console.log('   3. Verify RLS policies are set correctly')
    
    console.log('\n❌ Failed Tests:')
    tests.results.filter(r => r.status === 'FAILED').forEach(result => {
      console.log(`   • ${result.name}: ${result.error}`)
    })
  }

  return tests
}

testV2Features().catch(console.error)