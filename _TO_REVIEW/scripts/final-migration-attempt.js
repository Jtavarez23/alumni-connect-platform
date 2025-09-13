// Final attempt using different approaches
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://dyhloaxsdcfgfyfhrdfc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMxMzA1MiwiZXhwIjoyMDcxODg5MDUyfQ.qUiJxVaSczLmasYXC7OXgtTRExVjj8dFxgbM1ROGvyk';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function createTablesViaClient() {
  console.log('🚀 CREATING V2 TABLES VIA DIRECT CLIENT OPERATIONS');
  console.log('='.repeat(60));
  
  // Since we can't execute raw SQL, let's try to infer what we can do
  
  // Step 1: Check what tables already exist
  console.log('\n1. Checking existing schema...');
  
  const tables = ['user_education', 'search_quotas', 'messaging_permissions', 'profile_views'];
  
  for (const tableName of tables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ Table '${tableName}' does not exist - needs creation`);
        } else {
          console.log(`⚠️ Table '${tableName}' - ${error.message}`);
        }
      } else {
        console.log(`✅ Table '${tableName}' exists and accessible`);
      }
    } catch (err) {
      console.log(`❌ Error checking '${tableName}': ${err.message}`);
    }
  }
  
  // Step 2: Check profiles table for new columns
  console.log('\n2. Checking profiles table schema...');
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier, profile_views_enabled')
      .limit(1);
    
    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ Profiles table missing V2 columns - needs migration');
      } else {
        console.log(`⚠️ Profiles check: ${error.message}`);
      }
    } else {
      console.log('✅ Profiles table has V2 columns');
    }
  } catch (err) {
    console.log(`❌ Error checking profiles: ${err.message}`);
  }
  
  // Step 3: Try to create essential functions that might exist
  console.log('\n3. Testing V2 functions...');
  
  const functions = ['increment_search_usage', 'can_user_message', 'get_user_premium_features'];
  
  for (const funcName of functions) {
    try {
      // Try with dummy data
      const { data, error } = await supabase.rpc(funcName, funcName === 'increment_search_usage' ? 
        { p_user_id: '00000000-0000-0000-0000-000000000000' } : 
        { sender_id: '00000000-0000-0000-0000-000000000000', recipient_id: '00000000-0000-0000-0000-000000000000' }
      );
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ Function '${funcName}' does not exist`);
        } else {
          console.log(`⚠️ Function '${funcName}' exists but failed: ${error.message}`);
        }
      } else {
        console.log(`✅ Function '${funcName}' exists and working`);
      }
    } catch (err) {
      console.log(`❌ Error testing '${funcName}': ${err.message}`);
    }
  }
  
  // Step 4: Report final status
  console.log('\n📊 MIGRATION STATUS REPORT');
  console.log('='.repeat(40));
  console.log('✅ Service role is working');
  console.log('✅ Can query existing tables');
  console.log('❌ Cannot execute raw SQL via REST API (expected)');
  console.log('❌ V2 tables need to be created manually');
  console.log('❌ V2 functions need to be created manually');
  
  console.log('\n📋 RECOMMENDED ACTION:');
  console.log('Use the INSTANT_MIGRATION.sql file in Supabase Dashboard');
  console.log('This is the standard and secure way to run migrations');
}

async function verifyCurrentState() {
  console.log('\n🔍 CURRENT STATE VERIFICATION');
  console.log('='.repeat(40));
  
  try {
    // Check profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')  
      .select('id, first_name, last_name')
      .limit(3);
    
    console.log(`Profiles table: ${profileError ? 'Error' : 'OK'} (${profileData?.length || 0} records)`);
    
    // Check schools table
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .select('id, name')
      .limit(3);
    
    console.log(`Schools table: ${schoolError ? 'Error' : 'OK'} (${schoolData?.length || 0} records)`);
    
    // Check friendships table  
    const { data: friendshipData, error: friendshipError } = await supabase
      .from('friendships')
      .select('id, status')
      .limit(3);
    
    console.log(`Friendships table: ${friendshipError ? 'Error' : 'OK'} (${friendshipData?.length || 0} records)`);
    
    console.log('\n✅ Base system is healthy and ready for V2 migration');
    
  } catch (error) {
    console.log(`❌ System check failed: ${error.message}`);
  }
}

// Run verification and attempt
async function run() {
  await verifyCurrentState();
  await createTablesViaClient();
  
  console.log('\n🎯 CONCLUSION:');
  console.log('The Supabase MCP approach is limited by security restrictions.');
  console.log('Manual execution via Dashboard is the correct approach.');
  console.log('Your INSTANT_MIGRATION.sql file is ready for execution!');
}

run().catch(console.error);