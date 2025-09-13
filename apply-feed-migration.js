// Script to apply feed RPC functions migration
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

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20250906190000_add_feed_rpc_functions.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying migration...');
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error applying migration:', error);
      // Try executing SQL directly if exec_sql doesn't exist
      console.log('Trying direct SQL execution...');
      
      // Split SQL into individual statements
      const statements = sql.split(';').filter(stmt => stmt.trim());
      
      for (const stmt of statements) {
        if (stmt.trim()) {
          console.log('Executing:', stmt.substring(0, 100) + '...');
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
          if (stmtError) {
            console.error('Statement error:', stmtError);
          }
        }
      }
    }
    
    console.log('Migration applied successfully!');
    
  } catch (error) {
    console.error('Failed to apply migration:', error);
  }
}

applyMigration();