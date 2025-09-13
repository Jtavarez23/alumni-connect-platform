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

async function createExecSql() {
  try {
    console.log('Creating exec_sql function...');
    
    // Use the SQL endpoint to execute the CREATE FUNCTION statement
    const { error } = await supabase.from('sql').select('*');
    
    if (error && error.message.includes('Could not find the table')) {
      console.log('SQL endpoint not available, trying direct RPC...');
      
      // Try to execute the SQL directly using the service role
      const execSqlSQL = `
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
      
      // This might not work, but let's try
      console.log('Please run this SQL in the Supabase SQL editor:');
      console.log(execSqlSQL);
      
    } else {
      console.log('SQL endpoint available, attempting to create function...');
      // If SQL endpoint works, we could use it
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('Please create the exec_sql function manually in the Supabase SQL editor:');
    console.log(`
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
    `);
  }
}

createExecSql();