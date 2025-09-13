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

async function investigateRecursion() {
  try {
    console.log('🔍 Investigating recursion source...');
    
    // Check if there are any views that reference profiles
    console.log('1. Checking views that reference profiles...');
    const viewsCheck = await supabase.rpc('exec_sql', {
      sql: `
        SELECT viewname, definition 
        FROM pg_views 
        WHERE definition LIKE '%profiles%'
        AND schemaname = 'public'
      `
    });
    console.log('Views result:', viewsCheck);
    
    // Check if there are any materialized views
    console.log('2. Checking materialized views...');
    const matViewsCheck = await supabase.rpc('exec_sql', {
      sql: `
        SELECT matviewname, definition 
        FROM pg_matviews 
        WHERE definition LIKE '%profiles%'
        AND schemaname = 'public'
      `
    });
    console.log('Materialized views result:', matViewsCheck);
    
    // Check if there are any functions that might be called in policies
    console.log('3. Checking functions that might be used in policies...');
    const functionsCheck = await supabase.rpc('exec_sql', {
      sql: `
        SELECT proname, prosrc 
        FROM pg_proc 
        WHERE prosrc LIKE '%profiles%' 
        OR prosrc LIKE '%auth.uid%'
        OR prosrc LIKE '%connection%'
      `
    });
    console.log('Functions result:', functionsCheck);
    
    // Check if there are any other tables with RLS that might be causing cross-recursion
    console.log('4. Checking other tables with RLS...');
    const otherTablesCheck = await supabase.rpc('exec_sql', {
      sql: `
        SELECT relname 
        FROM pg_class 
        WHERE relrowsecurity = true 
        AND relname != 'profiles'
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      `
    });
    console.log('Other tables with RLS:', otherTablesCheck);
    
    // Try to create a policy that doesn't reference any other tables
    console.log('5. Creating ultra-simple policy...');
    await supabase.rpc('exec_sql', {
      sql: "ALTER TABLE profiles DISABLE ROW LEVEL SECURITY"
    });
    
    await supabase.rpc('exec_sql', {
      sql: "DROP POLICY IF EXISTS \"ultra_simple\" ON public.profiles"
    });
    
    await supabase.rpc('exec_sql', {
      sql: "ALTER TABLE profiles ENABLE ROW LEVEL SECURITY"
    });
    
    const ultraSimple = `
      CREATE POLICY "ultra_simple" ON public.profiles
        FOR SELECT USING (id = '00000000-0000-0000-0000-000000000000')
    `;
    
    const { error: ultraError } = await supabase.rpc('exec_sql', { sql: ultraSimple });
    if (ultraError) {
      console.error('Error creating ultra-simple policy:', ultraError.message);
    } else {
      console.log('✅ Ultra-simple policy created');
    }
    
    // Test with anonymous user
    console.log('6. Testing ultra-simple policy...');
    const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    const { error: testError } = await supabaseAnon.from('profiles').select('id').limit(1);
    
    if (testError) {
      console.error('Error with ultra-simple policy:', testError.message);
    } else {
      console.log('✅ Ultra-simple policy works');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

investigateRecursion();