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

async function createExecSqlFunction() {
  try {
    console.log('Attempting to create exec_sql function...');
    
    // This is a special approach - we'll try to use the service role
    // to execute SQL directly through a different method
    
    // First, let's check if we can use the service role to execute raw SQL
    // by trying to create a simple function
    const simpleFunctionSQL = `
CREATE OR REPLACE FUNCTION public.test_exec_sql()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN 'test successful';
END;
$$;
    `;
    
    console.log('Testing service role capabilities...');
    
    // Try to execute this through the REST API
    // This is a hacky approach but might work for service role
    const { data, error } = await supabase.rpc('exec_sql', { sql: simpleFunctionSQL });
    
    if (error) {
      console.log('Direct RPC execution not available, trying alternative approach...');
      
      // Alternative approach: use the service role to execute via different method
      console.log('Service role execution requires direct database access');
      console.log('Please use one of these methods to deploy the exec_sql function:');
      console.log('1. Supabase Dashboard SQL Editor');
      console.log('2. Direct psql connection');
      console.log('3. Supabase CLI with proper authentication');
      
      return false;
    }
    
    console.log('Function created successfully!');
    return true;
    
  } catch (error) {
    console.error('Failed to create exec_sql function:', error.message);
    return false;
  }
}

async function main() {
  console.log('=== Deploying exec_sql Function ===');
  
  // First check if exec_sql already exists
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
    if (error) {
      console.log('exec_sql function does not exist, attempting to create it...');
      await createExecSqlFunction();
    } else {
      console.log('✓ exec_sql function already exists');
      return true;
    }
  } catch (error) {
    console.log('exec_sql function check failed, attempting to create it...');
    await createExecSqlFunction();
  }
}

main();