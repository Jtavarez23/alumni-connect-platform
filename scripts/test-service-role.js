// Test service role and execute migrations
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dyhloaxsdcfgfyfhrdfc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMxMzA1MiwiZXhwIjoyMDcxODg5MDUyfQ.qUiJxVaSczLmasYXC7OXgtTRExVjj8dFxgbM1ROGvyk';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testServiceRole() {
  console.log('🔑 Testing Supabase Service Role Access');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Try to query existing profiles table
    console.log('Test 1: Querying profiles table...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name')
      .limit(3);
    
    if (profileError) {
      console.log('❌ Profiles query failed:', profileError.message);
    } else {
      console.log('✅ Profiles query successful:', profiles?.length || 0, 'records');
    }
    
    // Test 2: Try to query system tables
    console.log('\nTest 2: Checking system access...');
    const { data: tables, error: tableError } = await supabase
      .rpc('get_table_names');
    
    if (tableError) {
      console.log('❌ System query failed:', tableError.message);
    } else {
      console.log('✅ System access working');
    }
    
    // Test 3: Try creating a test table
    console.log('\nTest 3: Testing table creation...');
    
    // First check if we can create tables by using raw SQL
    const testSQL = `
      CREATE TABLE IF NOT EXISTS test_migration_v2 (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        test_column text DEFAULT 'migration_test',
        created_at timestamptz DEFAULT now()
      );
    `;
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql: testSQL })
      });
      
      if (response.ok) {
        console.log('✅ Raw SQL execution successful');
        await executeV2Migration();
      } else {
        console.log('❌ Raw SQL failed:', response.status);
        await tryAlternativeApproach();
      }
      
    } catch (fetchError) {
      console.log('❌ Fetch error:', fetchError.message);
      await tryAlternativeApproach();
    }
    
  } catch (error) {
    console.error('❌ Service role test failed:', error);
  }
}

async function tryAlternativeApproach() {
  console.log('\n🔄 Trying alternative approaches...');
  
  // Test if we can directly create tables using the client
  try {
    console.log('Creating user_education table directly...');
    
    const { error } = await supabase
      .from('user_education')
      .select('*')
      .limit(1);
    
    if (error && error.message.includes('does not exist')) {
      console.log('⚠️ Table does not exist - need to create schema first');
      
      // Try using SQL via PostgREST
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.user_education (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
          school_id uuid REFERENCES schools(id),
          start_year integer NOT NULL,
          end_year integer NOT NULL,
          created_at timestamptz DEFAULT now()
        );
      `;
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: createTableSQL })
      });
      
      const result = await response.text();
      console.log('Create table response:', response.status, result);
      
    } else if (!error) {
      console.log('✅ user_education table already exists!');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
    
  } catch (err) {
    console.log('❌ Direct table access failed:', err.message);
  }
}

async function executeV2Migration() {
  console.log('\n🚀 Executing V2 Migration with Service Role');
  console.log('='.repeat(50));
  
  // Core tables to create
  const migrations = [
    {
      name: 'user_education',
      sql: `
        CREATE TABLE IF NOT EXISTS public.user_education (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
          school_id uuid REFERENCES schools(id),
          school_type text,
          start_year integer NOT NULL,
          end_year integer NOT NULL,
          is_primary boolean DEFAULT false,
          role_type text DEFAULT 'student',
          created_at timestamptz DEFAULT now(),
          UNIQUE(user_id, school_id, start_year)
        );
        ALTER TABLE public.user_education ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "users_own_education" ON user_education FOR ALL USING (user_id = auth.uid());
      `
    },
    {
      name: 'profiles_columns',
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_tier') THEN
            ALTER TABLE public.profiles ADD COLUMN subscription_tier text DEFAULT 'free';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_views_enabled') THEN
            ALTER TABLE public.profiles ADD COLUMN profile_views_enabled boolean DEFAULT false;
          END IF;
        END $$;
      `
    },
    {
      name: 'search_quotas',
      sql: `
        CREATE TABLE IF NOT EXISTS public.search_quotas (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
          date date DEFAULT CURRENT_DATE,
          searches_used integer DEFAULT 0,
          search_limit integer DEFAULT 3,
          UNIQUE(user_id, date)
        );
        ALTER TABLE public.search_quotas ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "users_own_quotas" ON search_quotas FOR ALL USING (user_id = auth.uid());
      `
    }
  ];
  
  for (const migration of migrations) {
    console.log(`\nExecuting: ${migration.name}`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql: migration.sql })
      });
      
      if (response.ok) {
        console.log(`✅ ${migration.name} completed`);
      } else {
        const errorText = await response.text();
        console.log(`❌ ${migration.name} failed:`, errorText);
      }
      
    } catch (error) {
      console.log(`❌ ${migration.name} error:`, error.message);
    }
  }
}

// Run the test
testServiceRole()
  .then(() => console.log('\n🎯 Service role testing completed'))
  .catch(console.error);