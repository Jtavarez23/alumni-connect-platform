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

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic query
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Connection failed:', error.message);
      return false;
    }
    
    console.log('Connection successful! Profiles count:', data);
    return true;
    
  } catch (error) {
    console.error('Connection test failed:', error.message);
    return false;
  }
}

async function testRpc() {
  try {
    console.log('Testing RPC function...');
    
    // Test if exec_sql function exists
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: 'SELECT 1 as test' 
    });
    
    if (error) {
      console.log('exec_sql function not available yet');
      return false;
    }
    
    console.log('RPC test successful:', data);
    return true;
    
  } catch (error) {
    console.error('RPC test failed:', error.message);
    return false;
  }
}

async function main() {
  const connected = await testConnection();
  if (connected) {
    await testRpc();
  }
}

main();