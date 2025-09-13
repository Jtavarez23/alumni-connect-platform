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

async function debugRLSRecursion() {
  try {
    console.log('🔍 Debugging RLS Recursion...');
    
    // Test 1: Check if we can access the table with service role
    console.log('1. Testing service role access to profiles...');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(1);
    
    if (profilesError) {
      console.error('Service role cannot access profiles:', profilesError.message);
    } else {
      console.log('✅ Service role can access profiles:', profilesData?.length, 'records found');
    }
    
    // Test 2: Check if RLS is enabled on the table
    console.log('2. Checking if RLS is enabled on profiles...');
    const { data: rlsData, error: rlsError } = await supabase.rpc('exec_sql', {
      sql: "SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'profiles'"
    });
    
    if (rlsError) {
      console.error('Error checking RLS status:', rlsError.message);
    } else {
      console.log('RLS status:', rlsData);
    }
    
    // Test 3: Try to create a very simple policy
    console.log('3. Creating simplest possible policy...');
    const simplePolicy = `
      DROP POLICY IF EXISTS "test_simple_policy" ON public.profiles;
      CREATE POLICY "test_simple_policy" ON public.profiles
        FOR SELECT USING (true);
    `;
    
    const { error: policyError } = await supabase.rpc('exec_sql', { sql: simplePolicy });
    if (policyError) {
      console.error('Error creating simple policy:', policyError.message);
    } else {
      console.log('✅ Simple policy created successfully');
    }
    
    // Test 4: Test with the simple policy
    console.log('4. Testing with simple policy...');
    const { error: testError } = await supabase.from('profiles').select('id').limit(1);
    if (testError) {
      console.error('Error with simple policy:', testError.message);
    } else {
      console.log('✅ Simple policy works');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

debugRLSRecursion();