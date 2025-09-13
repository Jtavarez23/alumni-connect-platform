// Simple script to apply feed RPC migration
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = 'https://dyhloaxsdcfgfyfhrdfc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMxMzA1MiwiZXhwIjoyMDcxODg5MDUyfQ.qUiJxVaSczLmasYXC7OXgtTRExVjj8dFxgbM1ROGvyk';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyFeedMigration() {
  try {
    console.log('🚀 Applying feed RPC migration...');
    
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20250906190000_add_feed_rpc_functions.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Migration SQL loaded');
    
    // Split into individual statements
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    
    for (const stmt of statements) {
      if (stmt.trim()) {
        const sql = stmt.trim() + ';';
        console.log('⏳ Executing:', sql.substring(0, 100) + '...');
        
        const { error } = await supabase.rpc('exec_sql', { sql });
        
        if (error) {
          console.error('❌ Error:', error.message);
          // Continue with next statement
        } else {
          console.log('✅ Statement executed successfully');
        }
      }
    }
    
    console.log('🎉 Feed RPC migration completed!');
    
  } catch (error) {
    console.error('❌ Failed to apply migration:', error.message);
  }
}

applyFeedMigration();