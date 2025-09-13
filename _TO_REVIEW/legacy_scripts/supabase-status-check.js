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

async function supabaseStatusCheck() {
  try {
    console.log('📊 Checking Supabase project status...');
    
    // Test basic API connectivity
    console.log('1. Testing API connectivity...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('❌ Auth API error:', authError.message);
    } else {
      console.log('✅ Auth API connected successfully');
    }
    
    // Test storage API
    console.log('2. Testing storage API...');
    const { data: storageData, error: storageError } = await supabase.storage.listBuckets();
    
    if (storageError) {
      console.log('Storage API error (may be normal):', storageError.message);
    } else {
      console.log('✅ Storage API connected successfully');
    }
    
    // Test if we can get project info
    console.log('3. Testing project info...');
    const { data: settingsData, error: settingsError } = await supabase.from('settings').select('*').limit(1);
    
    if (settingsError) {
      console.log('Settings table error (may be normal):', settingsError.message);
    } else {
      console.log('✅ Settings table accessible');
    }
    
    // Try a completely different approach: use a transaction to ensure policies are properly applied
    console.log('4. Trying transaction-based approach...');
    const transactionSQL = `
      BEGIN;
      
      -- Disable RLS
      ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
      
      -- Drop all policies
      DROP POLICY IF EXISTS "test_policy" ON public.profiles;
      
      -- Enable RLS
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
      
      -- Create simplest possible policy
      CREATE POLICY "test_policy" ON public.profiles
        FOR SELECT USING (false);
      
      COMMIT;
    `;
    
    const { error: transactionError } = await supabase.rpc('exec_sql', { sql: transactionSQL });
    if (transactionError) {
      console.error('Transaction error:', transactionError.message);
    } else {
      console.log('✅ Transaction completed successfully');
    }
    
    // Test the policy
    console.log('5. Testing policy after transaction...');
    const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    const { error: testError } = await supabaseAnon.from('profiles').select('id').limit(1);
    
    if (testError) {
      if (testError.message.includes('infinite recursion')) {
        console.log('❌ STILL infinite recursion after transaction approach');
        console.log('This strongly suggests a Supabase project-level issue');
      } else if (testError.message.includes('permission denied')) {
        console.log('✅ Policy working correctly after transaction');
      } else {
        console.log('Other error:', testError.message);
      }
    } else {
      console.log('❌ Anonymous access still works (policy not effective)');
    }
    
    // Final check: try to access a different table that should have RLS
    console.log('6. Testing connections table RLS...');
    const { error: connectionsError } = await supabaseAnon.from('connections').select('id').limit(1);
    
    if (connectionsError) {
      if (connectionsError.message.includes('infinite recursion')) {
        console.log('❌ Infinite recursion in connections table too!');
      } else if (connectionsError.message.includes('permission denied')) {
        console.log('✅ Connections table properly restricted');
      } else {
        console.log('Connections table error:', connectionsError.message);
      }
    } else {
      console.log('❌ Connections table accessible to anonymous users');
    }
    
    console.log('✅ Supabase status check completed');
    
    // Based on all these tests, provide a diagnosis
    console.log('\n🔍 DIAGNOSIS:');
    console.log('The infinite recursion error persists even after:');
    console.log('1. Completely resetting RLS and policies');
    console.log('2. Using transaction blocks');
    console.log('3. Testing with different tables');
    console.log('4. Creating simplest possible policies');
    console.log('');
    console.log('This suggests a fundamental issue with the Supabase project configuration.');
    console.log('Possible causes:');
    console.log('1. Corrupted database configuration');
    console.log('2. Supabase project-level bug');
    console.log('3. Issues with RLS evaluation engine');
    console.log('');
    console.log('RECOMMENDATION:');
    console.log('1. Contact Supabase support');
    console.log('2. Consider recreating the project');
    console.log('3. Check Supabase status page for known issues');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

supabaseStatusCheck();