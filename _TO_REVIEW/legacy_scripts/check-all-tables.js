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

async function checkAllTables() {
  try {
    console.log('🔍 Checking all tables in database...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY schemaname, tablename"
    });
    
    if (error) {
      console.error('Error checking all tables:', error.message);
    } else {
      console.log('All tables in database:');
      if (data && data.length > 0) {
        data.forEach(table => {
          console.log(`- ${table.schemaname}.${table.tablename}`);
        });
      } else {
        console.log('No tables found in database');
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

checkAllTables();