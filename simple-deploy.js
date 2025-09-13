import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRpcFunctions() {
  try {
    console.log('Testing feed RPC functions...');
    
    // Test if get_network_feed exists
    const { data: networkData, error: networkError } = await supabase.rpc('get_network_feed', {
      p_cursor: null,
      p_limit: 5
    });
    
    if (networkError) {
      console.log('get_network_feed function not available yet');
    } else {
      console.log('get_network_feed function exists and returned:', networkData?.length || 0, 'items');
    }
    
    // Test if get_for_you_feed exists
    const { data: forYouData, error: forYouError } = await supabase.rpc('get_for_you_feed', {
      p_cursor: null,
      p_limit: 5
    });
    
    if (forYouError) {
      console.log('get_for_you_feed function not available yet');
    } else {
      console.log('get_for_you_feed function exists and returned:', forYouData?.length || 0, 'items');
    }
    
    return !networkError && !forYouError;
    
  } catch (error) {
    console.error('RPC test failed:', error.message);
    return false;
  }
}

async function checkExistingTables() {
  try {
    console.log('Checking if core tables exist...');
    
    // Check if events table exists
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('count(*)')
      .limit(1);
    
    if (eventsError) {
      console.log('events table does not exist yet');
    } else {
      console.log('events table exists');
    }
    
    // Check if businesses table exists
    const { data: businessesData, error: businessesError } = await supabase
      .from('businesses')
      .select('count(*)')
      .limit(1);
    
    if (businessesError) {
      console.log('businesses table does not exist yet');
    } else {
      console.log('businesses table exists');
    }
    
  } catch (error) {
    console.error('Table check failed:', error.message);
  }
}

async function main() {
  console.log('=== Supabase Connection Test ===');
  
  // Test basic connection
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
  
  if (profileError) {
    console.error('Basic connection failed:', profileError.message);
    return;
  }
  
  console.log('✓ Basic connection successful');
  
  // Check existing tables
  await checkExistingTables();
  
  // Test RPC functions
  const rpcFunctionsExist = await testRpcFunctions();
  
  if (rpcFunctionsExist) {
    console.log('✓ All feed RPC functions are already deployed!');
  } else {
    console.log('⚠ Feed RPC functions need to be deployed');
    console.log('Please run the migration using one of these methods:');
    console.log('1. Use Supabase dashboard SQL editor');
    console.log('2. Use Supabase CLI: npx supabase db push');
    console.log('3. Use direct database connection with psql');
  }
}

main();