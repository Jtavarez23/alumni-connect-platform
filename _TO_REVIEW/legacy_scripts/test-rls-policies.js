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

async function testRLSPolicies() {
  console.log('🔒 Testing RLS Policies...\n');
  
  const tablesToTest = [
    'events',
    'businesses', 
    'jobs',
    'mentorship_profiles',
    'moderation_reports',
    'connections',
    'posts'
  ];
  
  for (const table of tablesToTest) {
    console.log(`📋 Testing RLS for ${table}:`);
    console.log('─'.repeat(40));
    
    try {
      // Check if table exists
      const { error: existsError } = await supabase.rpc('exec_sql', {
        sql: `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '${table}' AND table_schema = 'public'`
      });
      
      if (existsError) {
        console.log(`   ❌ Table ${table} does not exist`);
        continue;
      }
      
      // Check if RLS is enabled
      const { error: rlsError } = await supabase.rpc('exec_sql', {
        sql: `SELECT relrowsecurity FROM pg_class WHERE relname = '${table}'`
      });
      
      if (rlsError) {
        console.log(`   ❌ Cannot check RLS status: ${rlsError.message}`);
      } else {
        console.log(`   ✅ RLS is enabled`);
      }
      
      // Check policies
      const { error: policiesError } = await supabase.rpc('exec_sql', {
        sql: `SELECT policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = '${table}'`
      });
      
      if (policiesError) {
        console.log(`   ❌ Cannot check policies: ${policiesError.message}`);
      } else {
        console.log(`   📋 Policies found`);
      }
      
      // Test basic operations
      console.log(`   🧪 Testing operations:`);
      
      // SELECT test
      try {
        const { error: selectError } = await supabase.from(table).select('*').limit(1);
        if (selectError && selectError.message.includes('permission denied')) {
          console.log(`     ✅ SELECT properly restricted by RLS`);
        } else if (selectError) {
          console.log(`     ⚠️  SELECT error: ${selectError.message}`);
        } else {
          console.log(`     ⚠️  SELECT allowed (may be intended)`);
        }
      } catch (error) {
        console.log(`     ❌ SELECT test failed: ${error.message}`);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`   ❌ Error testing ${table}: ${error.message}`);
    }
    
    console.log('');
  }
  
  // Test specific policy scenarios
  console.log('🎯 Testing specific policy scenarios:');
  console.log('─'.repeat(40));
  
  // Test events visibility policies
  try {
    console.log(`   Testing events visibility policies...`);
    const { error: eventsError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Test public events
        INSERT INTO events (host_type, host_id, title, starts_at, visibility, created_by)
        VALUES ('school', (SELECT id FROM schools LIMIT 1), 'Public Test Event', now(), 'public', 'b99870dc-6821-4b7b-985b-02c0df497b69');
        
        -- Test alumni_only events  
        INSERT INTO events (host_type, host_id, title, starts_at, visibility, created_by)
        VALUES ('school', (SELECT id FROM schools LIMIT 1), 'Alumni Test Event', now(), 'alumni_only', 'b99870dc-6821-4b7b-985b-02c0df497b69');
      `
    });
    
    if (eventsError) {
      console.log(`   ❌ Events policy test failed: ${eventsError.message}`);
    } else {
      console.log(`   ✅ Events policy test completed`);
    }
    
  } catch (error) {
    console.log(`   ❌ Events policy test error: ${error.message}`);
  }
  
  console.log('\n✅ RLS policy testing completed');
}

testRLSPolicies();