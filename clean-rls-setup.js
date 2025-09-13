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

async function cleanRLSSetup() {
  try {
    console.log('🧹 Creating clean RLS setup...');
    
    // Disable RLS first
    console.log('1. Disabling RLS...');
    await supabase.rpc('exec_sql', {
      sql: "ALTER TABLE profiles DISABLE ROW LEVEL SECURITY"
    });
    
    // Drop ALL policies
    console.log('2. Dropping all policies...');
    await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    
    // Enable RLS
    console.log('3. Enabling RLS...');
    await supabase.rpc('exec_sql', {
      sql: "ALTER TABLE profiles ENABLE ROW LEVEL SECURITY"
    });
    
    // Create very simple, non-recursive policies
    console.log('4. Creating simple policies...');
    const simplePolicies = `
      -- Allow users to see their own profile
      CREATE POLICY "view_own_profile" ON public.profiles
        FOR SELECT USING (id = auth.uid());
      
      -- Allow users to see public profiles
      CREATE POLICY "view_public_profiles" ON public.profiles
        FOR SELECT USING (privacy_level = 'public');
      
      -- Allow users to update their own profile
      CREATE POLICY "update_own_profile" ON public.profiles
        FOR UPDATE USING (id = auth.uid());
      
      -- Allow users to insert their own profile
      CREATE POLICY "insert_own_profile" ON public.profiles
        FOR INSERT WITH CHECK (id = auth.uid());
    `;
    
    const { error: policyError } = await supabase.rpc('exec_sql', { sql: simplePolicies });
    if (policyError) {
      console.error('Error creating policies:', policyError.message);
    } else {
      console.log('✅ Simple policies created successfully');
    }
    
    // Test the new setup
    console.log('5. Testing new setup...');
    const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    const { error: testError } = await supabaseAnon.from('profiles').select('id').limit(1);
    
    if (testError) {
      if (testError.message.includes('permission denied')) {
        console.log('✅ Anonymous user properly restricted (expected)');
      } else {
        console.error('Unexpected error:', testError.message);
      }
    } else {
      console.log('❌ Anonymous user can access profiles (RLS not working properly)');
    }
    
    console.log('✅ Clean RLS setup completed');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

cleanRLSSetup();