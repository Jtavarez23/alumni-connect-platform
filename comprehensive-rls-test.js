import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function comprehensiveRLSTest() {
  try {
    console.log('🧪 Comprehensive RLS Test...');
    
    // Test 1: Service role should always work
    console.log('1. Testing service role access...');
    const { data: serviceData, error: serviceError } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(1);
    
    if (serviceError) {
      console.error('❌ Service role cannot access profiles:', serviceError.message);
    } else {
      console.log('✅ Service role can access profiles:', serviceData?.length, 'records');
    }
    
    // Test 2: Test with a completely different table to see if the issue is specific to profiles
    console.log('2. Testing events table with service role...');
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('id, title')
      .limit(1);
    
    if (eventsError) {
      console.error('❌ Service role cannot access events:', eventsError.message);
    } else {
      console.log('✅ Service role can access events:', eventsData?.length, 'records');
    }
    
    // Test 3: Test anonymous user with events table (should work if RLS is configured properly)
    console.log('3. Testing anonymous user with events table...');
    const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    const { error: eventsAnonError } = await supabaseAnon
      .from('events')
      .select('id')
      .limit(1);
    
    if (eventsAnonError) {
      if (eventsAnonError.message.includes('permission denied')) {
        console.log('✅ Events table properly restricted for anonymous users');
      } else if (eventsAnonError.message.includes('infinite recursion')) {
        console.log('❌ Infinite recursion in events table too:', eventsAnonError.message);
      } else {
        console.log('⚠️  Events table error:', eventsAnonError.message);
      }
    } else {
      console.log('❌ Events table accessible to anonymous users (RLS may be disabled)');
    }
    
    // Test 4: Try to completely reset the profiles table RLS
    console.log('4. Completely resetting profiles RLS...');
    await supabase.rpc('exec_sql', {
      sql: `
        -- Disable RLS
        ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
        
        -- Drop all policies
        DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
        DROP POLICY IF EXISTS "Users can view public profile information based on connection" ON public.profiles;
        DROP POLICY IF EXISTS "Users can view profiles based on connection and privacy" ON public.profiles;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
        DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
        DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;
        DROP POLICY IF EXISTS "test_simple_policy" ON public.profiles;
        DROP POLICY IF EXISTS "Simple profiles access" ON public.profiles;
        DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
        DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
        DROP POLICY IF EXISTS "ultra_simple" ON public.profiles;
        DROP POLICY IF EXISTS "direct_test" ON public.profiles;
        DROP POLICY IF EXISTS "view_own_profile" ON public.profiles;
        DROP POLICY IF EXISTS "view_public_profiles" ON public.profiles;
        DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
        DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
        
        -- Enable RLS
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
      `
    });
    
    console.log('✅ RLS completely reset');
    
    // Test 5: Test anonymous user after complete reset (should give permission denied, not infinite recursion)
    console.log('5. Testing anonymous user after complete reset...');
    const { error: finalError } = await supabaseAnon
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (finalError) {
      if (finalError.message.includes('permission denied')) {
        console.log('✅ Anonymous user properly restricted after reset');
      } else if (finalError.message.includes('infinite recursion')) {
        console.log('❌ STILL infinite recursion after complete reset:', finalError.message);
        console.log('This suggests a fundamental issue with the database configuration');
      } else {
        console.log('⚠️  Other error:', finalError.message);
      }
    } else {
      console.log('❌ Anonymous user can access profiles (no policies = full access)');
    }
    
    console.log('✅ Comprehensive RLS test completed');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

comprehensiveRLSTest();