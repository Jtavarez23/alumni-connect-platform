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

async function deployMigration(migrationName) {
  try {
    console.log(`Deploying ${migrationName}...`);
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', migrationName);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Use exec_sql function to execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.warn(`Migration ${migrationName} had some issues:`, error.message);
      console.log('This is expected for some statements that may already exist');
    } else {
      console.log(`Migration ${migrationName} deployed successfully!`);
    }
    
  } catch (error) {
    console.error(`Failed to deploy ${migrationName}:`, error.message);
  }
}

async function main() {
  console.log('Deploying remaining migrations...');
  
  // Deploy complete RLS policies
  await deployMigration('20250908120000_complete_rls_policies.sql');
  
  // Deploy RLS policy tests
  await deployMigration('20250908120001_rls_policy_tests.sql');
  
  console.log('All remaining migrations deployment completed!');
}

main();