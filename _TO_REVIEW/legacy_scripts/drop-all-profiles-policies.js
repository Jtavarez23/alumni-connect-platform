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

async function dropAllProfilesPolicies() {
  try {
    console.log('🗑️  Dropping all policies on profiles table...');
    
    // Drop all policies on profiles table
    const dropPolicies = `
      DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
      DROP POLICY IF EXISTS "Users can view public profile information based on connection" ON public.profiles;
      DROP POLICY IF EXISTS "Users can view profiles based on connection and privacy" ON public.profiles;
      DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
      DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
      DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;
    `;
    
    const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropPolicies });
    if (dropError) {
      console.error('Error dropping policies:', dropError.message);
    } else {
      console.log('✅ All profiles policies dropped');
    }
    
    // Create a simple, non-recursive policy
    const createPolicy = `
      CREATE POLICY "Simple profiles access" ON public.profiles
        FOR SELECT USING (
          id = auth.uid() OR
          privacy_level = 'public'
        );
        
      CREATE POLICY "Users can update own profile" ON public.profiles
        FOR UPDATE USING (id = auth.uid());
        
      CREATE POLICY "Users can insert own profile" ON public.profiles
        FOR INSERT WITH CHECK (id = auth.uid());
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createPolicy });
    if (createError) {
      console.error('Error creating simple policy:', createError.message);
    } else {
      console.log('✅ Simple profiles policy created');
    }
    
    console.log('✅ Profiles policies reset successfully');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

dropAllProfilesPolicies();