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

async function checkDatabaseHealth() {
  try {
    console.log('🏥 Checking database health...');
    
    // Check database version and configuration
    console.log('1. Checking database version...');
    const versionResult = await supabase.rpc('exec_sql', {
      sql: "SELECT version(), current_setting('server_version_num') as version_num"
    });
    console.log('Database version result:', versionResult);
    
    // Check if there are any locks or issues
    console.log('2. Checking for locks...');
    const locksResult = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          locktype, 
          relation::regclass,
          mode, 
          granted 
        FROM pg_locks 
        WHERE relation = 'profiles'::regclass
      `
    });
    console.log('Locks result:', locksResult);
    
    // Check if the table is corrupted
    console.log('3. Checking table health...');
    const tableHealth = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          n_live_tup,
          n_dead_tup,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_all_tables 
        WHERE relname = 'profiles'
      `
    });
    console.log('Table health:', tableHealth);
    
    // Try to vacuum the table to see if it fixes anything
    console.log('4. Trying to vacuum profiles table...');
    const vacuumResult = await supabase.rpc('exec_sql', {
      sql: "VACUUM ANALYZE profiles"
    });
    console.log('Vacuum result:', vacuumResult);
    
    // Try to create a completely new table to test if the issue is table-specific
    console.log('5. Creating test table...');
    const testTableResult = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS test_rls (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE test_rls ENABLE ROW LEVEL SECURITY;
        
        -- Create simple policy
        CREATE POLICY "test_policy" ON test_rls
          FOR SELECT USING (true);
        
        -- Insert test data
        INSERT INTO test_rls (name) VALUES ('test');
      `
    });
    console.log('Test table result:', testTableResult);
    
    // Test the new table
    console.log('6. Testing new table...');
    const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    const { error: testError } = await supabaseAnon
      .from('test_rls')
      .select('id')
      .limit(1);
    
    if (testError) {
      if (testError.message.includes('infinite recursion')) {
        console.log('❌ Infinite recursion in NEW table too! This is a system-wide issue');
      } else {
        console.log('Test table error:', testError.message);
      }
    } else {
      console.log('✅ New table works correctly');
    }
    
    // Clean up
    console.log('7. Cleaning up test table...');
    const cleanupResult = await supabase.rpc('exec_sql', {
      sql: "DROP TABLE IF EXISTS test_rls"
    });
    console.log('Cleanup result:', cleanupResult);
    
    console.log('✅ Database health check completed');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

checkDatabaseHealth();