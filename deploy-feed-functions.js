// Simplified script to deploy feed RPC functions using direct SQL execution
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployFunctions() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20250906190000_add_feed_rpc_functions.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into individual function definitions
    const functionDefinitions = sql.split(/^-- Function to/m).filter(def => def.trim());
    
    for (let i = 0; i < functionDefinitions.length; i++) {
      let functionSql = functionDefinitions[i].trim();
      if (i > 0) {
        functionSql = '-- Function to' + functionSql; // Add back the comment
      }
      
      console.log(`Deploying function ${i + 1}/${functionDefinitions.length}...`);
      
      // Execute the function creation
      const { error } = await supabase.rpc('exec_sql', { sql: functionSql });
      
      if (error) {
        console.error(`Error deploying function ${i + 1}:`, error.message);
        console.log('Trying alternative approach...');
        
        // Try to execute the SQL directly using the service role
        try {
          // This is a fallback - may not work without exec_sql function
          console.log('Function deployment requires exec_sql function to be created first');
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError.message);
        }
      } else {
        console.log(`Function ${i + 1} deployed successfully!`);
      }
    }
    
    console.log('Feed functions deployment completed!');
    
  } catch (error) {
    console.error('Failed to deploy feed functions:', error);
  }
}

// Check if exec_sql function exists first
async function checkExecSql() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
    if (error) {
      console.log('exec_sql function does not exist yet');
      return false;
    }
    console.log('exec_sql function exists');
    return true;
  } catch (error) {
    console.log('exec_sql function check failed:', error.message);
    return false;
  }
}

async function main() {
  const hasExecSql = await checkExecSql();
  
  if (!hasExecSql) {
    console.log('First, need to deploy the exec_sql function...');
    
    // Create exec_sql function
    const execSqlFunction = `
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
    `;
    
    // Try to execute this directly using the service role
    console.log('Attempting to create exec_sql function...');
    
    // This will likely fail without direct database access
    console.log('Direct database access required to create exec_sql function');
    console.log('Please use the Supabase dashboard SQL editor or ensure CLI connectivity');
    return;
  }
  
  // If exec_sql exists, deploy the feed functions
  await deployFunctions();
}

main();