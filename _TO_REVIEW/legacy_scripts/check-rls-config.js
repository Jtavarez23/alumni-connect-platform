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

async function checkRLSConfig() {
  try {
    console.log('🔍 Checking RLS configuration...');
    
    // Check if RLS is enabled on profiles table
    console.log('1. Checking RLS status on profiles table...');
    const rlsCheck = await supabase.rpc('exec_sql', {
      sql: "SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'profiles'"
    });
    console.log('RLS check result:', rlsCheck);
    
    // Check all policies on profiles table
    console.log('2. Checking all policies...');
    const policiesCheck = await supabase.rpc('exec_sql', {
      sql: "SELECT * FROM pg_policies WHERE tablename = 'profiles'"
    });
    console.log('Policies check result:', policiesCheck);
    
    // Check if there are any triggers on profiles table
    console.log('3. Checking triggers...');
    const triggersCheck = await supabase.rpc('exec_sql', {
      sql: `
        SELECT tgname, tgtype, tgfoid::regproc, tgqual 
        FROM pg_trigger 
        WHERE tgrelid = 'profiles'::regclass
      `
    });
    console.log('Triggers check result:', triggersCheck);
    
    // Check if there are any security definer functions that might be causing recursion
    console.log('4. Checking security definer functions...');
    const functionsCheck = await supabase.rpc('exec_sql', {
      sql: `
        SELECT proname, prosecdef 
        FROM pg_proc 
        WHERE prosecdef = true 
        AND proname LIKE '%profile%'
      `
    });
    console.log('Security definer functions:', functionsCheck);
    
    // Try to completely disable RLS temporarily
    console.log('5. Trying to disable RLS...');
    const disableRLS = await supabase.rpc('exec_sql', {
      sql: "ALTER TABLE profiles DISABLE ROW LEVEL SECURITY"
    });
    console.log('Disable RLS result:', disableRLS);
    
    // Test anonymous access after disabling RLS
    console.log('6. Testing anonymous access after disabling RLS...');
    const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    const { error } = await supabaseAnon.from('profiles').select('id').limit(1);
    
    if (error) {
      console.error('Still error after disabling RLS:', error.message);
    } else {
      console.log('✅ Anonymous access works after disabling RLS');
    }
    
    // Re-enable RLS
    console.log('7. Re-enabling RLS...');
    const enableRLS = await supabase.rpc('exec_sql', {
      sql: "ALTER TABLE profiles ENABLE ROW LEVEL SECURITY"
    });
    console.log('Enable RLS result:', enableRLS);
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

checkRLSConfig();