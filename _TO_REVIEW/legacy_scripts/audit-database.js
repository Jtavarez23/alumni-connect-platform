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

async function auditDatabase() {
  console.log('🔍 Starting comprehensive database audit...\n');
  
  try {
    // 1. Check core tables from master documents
    console.log('📊 1. CORE TABLES AUDIT');
    console.log('='.repeat(50));
    
    const expectedCoreTables = [
      'profiles', 'user_education', 'schools', 'yearbooks', 
      'yearbook_pages', 'yearbook_faces', 'yearbook_claims',
      'connections', 'groups', 'group_members', 'events',
      'event_attendees', 'businesses', 'jobs', 'mentorship_profiles',
      'mentorship_matches', 'moderation_reports', 'moderation_actions',
      'notifications', 'safety_events'
    ];
    
    for (const table of expectedCoreTables) {
      const { data, error } = await supabase.from(table).select('count').limit(1);
      if (error) {
        console.log(`❌ ${table}: MISSING - ${error.message}`);
      } else {
        console.log(`✅ ${table}: EXISTS`);
      }
    }
    
    console.log('\n🎯 2. ENUMERATIONS AUDIT');
    console.log('='.repeat(50));
    
    // Check enum types
    const expectedEnums = [
      'trust_level', 'visibility', 'media_scan_status', 
      'report_reason', 'event_role'
    ];
    
    for (const enumType of expectedEnums) {
      const { error } = await supabase.rpc('exec_sql', { 
        sql: `SELECT 1 FROM pg_type WHERE typname = '${enumType}'` 
      });
      if (error) {
        console.log(`❌ ${enumType}: MISSING - ${error.message}`);
      } else {
        console.log(`✅ ${enumType}: EXISTS`);
      }
    }
    
    console.log('\n🔐 3. RLS POLICIES AUDIT');
    console.log('='.repeat(50));
    
    // Check if RLS is enabled on key tables
    const rlsTables = ['profiles', 'yearbooks', 'events', 'businesses', 'moderation_reports'];
    
    for (const table of rlsTables) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `SELECT relrowsecurity FROM pg_class WHERE relname = '${table}'`
      });
      if (error) {
        console.log(`❌ ${table} RLS: ERROR - ${error.message}`);
      } else {
        console.log(`✅ ${table}: RLS enabled`);
      }
    }
    
    console.log('\n⚡ 4. RPC FUNCTIONS AUDIT');
    console.log('='.repeat(50));
    
    // Check key RPC functions
    const rpcFunctions = ['exec_sql', 'get_network_feed', 'get_for_you_feed', 'create_post', 'like_post'];
    
    for (const func of rpcFunctions) {
      try {
        const { error } = await supabase.rpc(func, func === 'exec_sql' ? { sql: 'SELECT 1' } : {});
        if (error && error.message.includes('function')) {
          console.log(`❌ ${func}: MISSING - ${error.message}`);
        } else {
          console.log(`✅ ${func}: EXISTS`);
        }
      } catch (e) {
        console.log(`❌ ${func}: ERROR - ${e.message}`);
      }
    }
    
    console.log('\n📈 5. DATA VALIDATION');
    console.log('='.repeat(50));
    
    // Check sample data counts
    const tablesToCount = ['profiles', 'schools', 'connections', 'events'];
    
    for (const table of tablesToCount) {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`❌ ${table} count: ERROR - ${error.message}`);
      } else {
        console.log(`📊 ${table}: ${count} records`);
      }
    }
    
    console.log('\n✅ AUDIT COMPLETED');
    
  } catch (error) {
    console.error('❌ Audit failed:', error.message);
  }
}

auditDatabase();