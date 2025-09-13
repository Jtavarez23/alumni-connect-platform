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

async function checkTables() {
  try {
    console.log('🔍 Checking what tables exist...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    });
    
    if (error) {
      console.error('Error checking tables:', error.message);
    } else {
      console.log('Public tables:');
      if (data && data.length > 0) {
        data.forEach(table => {
          console.log(`- ${table.table_name}`);
        });
      } else {
        console.log('No tables found in public schema');
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

checkTables();