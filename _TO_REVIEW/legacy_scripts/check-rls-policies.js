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

async function checkRlsPolicies() {
  console.log('Checking RLS policies in detail...\n');
  
  const tablesToCheck = [
    'profiles', 'yearbooks', 'events', 'businesses', 'moderation_reports',
    'groups', 'group_members', 'connections', 'notifications'
  ];
  
  for (const table of tablesToCheck) {
    try {
      console.log(`📋 ${table}:`);
      
      // Check if RLS is enabled
      const { error: rlsError } = await supabase.rpc('exec_sql', {
        sql: `SELECT relrowsecurity FROM pg_class WHERE relname = '${table}'`
      });
      
      if (rlsError) {
        console.log(`   ❌ RLS check failed: ${rlsError.message}`);
        continue;
      }
      
      // Check policies
      const { error: policyError } = await supabase.rpc('exec_sql', {
        sql: `SELECT policyname, cmd, permissive FROM pg_policies WHERE tablename = '${table}' ORDER BY policyname`
      });
      
      if (policyError) {
        console.log(`   ❌ Policy check failed: ${policyError.message}`);
      } else {
        console.log(`   ✅ RLS enabled with policies`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error checking ${table}: ${error.message}`);
    }
  }
  
  console.log('\n🔍 Checking specific policy examples...');
  
  // Test specific policy scenarios
  const testCases = [
    {
      name: 'Profiles public visibility',
      sql: `SELECT COUNT(*) FROM profiles WHERE privacy_settings->>'profile_visibility' = 'public'`
    },
    {
      name: 'Businesses count',
      sql: `SELECT COUNT(*) FROM businesses WHERE is_verified = true`
    }
  ];
  
  for (const test of testCases) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: test.sql });
      if (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
      } else {
        console.log(`✅ ${test.name}: Query successful`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
  }
}

checkRlsPolicies();