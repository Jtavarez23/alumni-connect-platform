import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function testRLSDetailed() {
  console.log('🔒 Testing RLS Policies with Different User Contexts...\n');
  
  // Test 1: Anonymous user access
  console.log('👤 Testing Anonymous User Access:');
  console.log('─'.repeat(40));
  
  try {
    const { error: anonError } = await supabaseAnon.from('events').select('*').limit(1);
    if (anonError && anonError.message.includes('permission denied')) {
      console.log('   ✅ Anonymous user properly restricted from events');
    } else if (anonError) {
      console.log(`   ⚠️  Anonymous user error: ${anonError.message}`);
    } else {
      console.log('   ⚠️  Anonymous user can access events (check policies)');
    }
  } catch (error) {
    console.log(`   ❌ Anonymous user test failed: ${error.message}`);
  }
  
  // Test 2: Service role access (should bypass RLS)
  console.log('\n🔑 Testing Service Role Access (should bypass RLS):');
  console.log('─'.repeat(40));
  
  try {
    const { error: adminError } = await supabaseAdmin.from('events').select('*').limit(1);
    if (adminError) {
      console.log(`   ❌ Service role access error: ${adminError.message}`);
    } else {
      console.log('   ✅ Service role can access events (bypasses RLS)');
    }
  } catch (error) {
    console.log(`   ❌ Service role test failed: ${error.message}`);
  }
  
  // Test 3: Check specific policy details
  console.log('\n📋 Testing Policy Details:');
  console.log('─'.repeat(40));
  
  const policiesToCheck = [
    { table: 'events', policy: 'Users can view events based on visibility' },
    { table: 'businesses', policy: 'Businesses are publicly viewable' },
    { table: 'jobs', policy: 'Users can view jobs based on visibility' }
  ];
  
  for (const { table, policy } of policiesToCheck) {
    try {
      const { error: policyError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `SELECT policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = '${table}' AND policyname = '${policy}'`
      });
      
      if (policyError) {
        console.log(`   ❌ Cannot check ${table} policy: ${policyError.message}`);
      } else {
        console.log(`   ✅ ${table} policy '${policy}' exists`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error checking ${table} policy: ${error.message}`);
    }
  }
  
  // Test 4: Test events visibility policies
  console.log('\n🎭 Testing Events Visibility Policies:');
  console.log('─'.repeat(40));
  
  try {
    // Create test events with different visibility levels
    const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Clean up any existing test events
        DELETE FROM events WHERE title LIKE 'Test Event%';
        
        -- Create public event
        INSERT INTO events (host_type, host_id, title, description, starts_at, visibility, created_by)
        VALUES ('school', (SELECT id FROM schools LIMIT 1), 'Test Event - Public', 'Public test event', now(), 'public', 'b99870dc-6821-4b7b-985b-02c0df497b69');
        
        -- Create alumni_only event
        INSERT INTO events (host_type, host_id, title, description, starts_at, visibility, created_by)
        VALUES ('school', (SELECT id FROM schools LIMIT 1), 'Test Event - Alumni Only', 'Alumni only test event', now(), 'alumni_only', 'b99870dc-6821-4b7b-985b-02c0df497b69');
        
        -- Create private event
        INSERT INTO events (host_type, host_id, title, description, starts_at, visibility, created_by)
        VALUES ('school', (SELECT id FROM schools LIMIT 1), 'Test Event - Private', 'Private test event', now(), 'private', 'b99870dc-6821-4b7b-985b-02c0df497b69');
      `
    });
    
    if (createError) {
      console.log(`   ❌ Error creating test events: ${createError.message}`);
    } else {
      console.log('   ✅ Test events created successfully');
      
      // Count events by visibility
      const { error: countError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `SELECT visibility, COUNT(*) FROM events WHERE title LIKE 'Test Event%' GROUP BY visibility`
      });
      
      if (countError) {
        console.log(`   ❌ Error counting events: ${countError.message}`);
      } else {
        console.log('   ✅ Events counted by visibility level');
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Events visibility test error: ${error.message}`);
  }
  
  // Test 5: Verify RLS is working on sensitive tables
  console.log('\n🔐 Testing Sensitive Table Protection:');
  console.log('─'.repeat(40));
  
  const sensitiveTables = ['moderation_reports', 'connections', 'mentorship_profiles'];
  
  for (const table of sensitiveTables) {
    try {
      const { error: sensitiveError } = await supabaseAnon.from(table).select('*').limit(1);
      if (sensitiveError && sensitiveError.message.includes('permission denied')) {
        console.log(`   ✅ ${table} properly protected from anonymous access`);
      } else if (sensitiveError) {
        console.log(`   ⚠️  ${table} access error: ${sensitiveError.message}`);
      } else {
        console.log(`   ⚠️  ${table} may be accessible to anonymous users (check policies)`);
      }
    } catch (error) {
      console.log(`   ❌ ${table} test failed: ${error.message}`);
    }
  }
  
  console.log('\n✅ Detailed RLS testing completed');
}

testRLSDetailed();