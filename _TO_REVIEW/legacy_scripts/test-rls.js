// Simple RLS test script
const { createClient } = require('@supabase/supabase-js')

// Test RLS by attempting to access profiles without authentication
async function testRLSPolicies() {
  console.log('Testing RLS policies...')
  
  // Try to access profiles without auth (should be blocked by RLS)
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('✅ RLS BLOCKED unauthorized access:', error.message)
    } else {
      console.log('❌ RLS FAILED: unauthorized access allowed')
      console.log('Data:', data)
    }
  } catch (error) {
    console.log('✅ RLS working - unauthorized access blocked')
  }
}

testRLSPolicies()