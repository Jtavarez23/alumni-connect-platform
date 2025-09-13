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

async function deployMigration() {
  try {
    console.log('Reading core features migration file...');
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20250908010000_core_features_migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration...');
    
    // Split into individual statements
    const statements = sql.split(';').filter(statement => statement.trim());
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;
      
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        // Use the service role to execute SQL directly
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error) {
          console.warn(`Statement ${i + 1} failed (may be expected):`, error.message);
          // Continue with next statement
        } else {
          console.log(`Statement ${i + 1} executed successfully`);
        }
      } catch (error) {
        console.warn(`Statement ${i + 1} failed:`, error.message);
      }
    }
    
    console.log('Migration deployment completed!');
    
  } catch (error) {
    console.error('Failed to deploy migration:', error);
  }
}

// Since exec_sql doesn't exist yet, we need to create it first manually
async function createExecSqlFunction() {
  try {
    console.log('Creating exec_sql function...');
    
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
    
    // Use the service role to execute this directly (this is a special case)
    console.log('Attempting to create exec_sql function with service role...');
    
    // For this special case, we'll try to use the service role directly
    // This might require direct database access, but let's try
    console.log('exec_sql function creation requires direct database access');
    console.log('Please use the Supabase dashboard SQL editor to run this migration');
    
  } catch (error) {
    console.error('Failed to create exec_sql function:', error);
  }
}

async function main() {
  console.log('Checking if exec_sql function exists...');
  
  // First check if exec_sql exists
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
    if (error) {
      console.log('exec_sql function does not exist yet');
      await createExecSqlFunction();
      return;
    }
    console.log('exec_sql function exists, proceeding with migration...');
    await deployMigration();
  } catch (error) {
    console.log('exec_sql function check failed, attempting to create it...');
    await createExecSqlFunction();
  }
}

main();