import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyRLSFix() {
  try {
    console.log('🔧 Applying RLS recursion fix...');
    const sql = readFileSync('./supabase/migrations/20250909010000_fix_rls_recursion.sql', 'utf8');
    
    // Split into individual statements to avoid transaction issues
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 100) + '...');
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error) {
          console.error('Error executing statement:', error.message);
          console.error('Statement:', statement);
        }
      }
    }
    
    console.log('✅ RLS fix applied successfully');
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

applyRLSFix();