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

async function testExecSQL() {
  try {
    console.log('🧪 Testing exec_sql function...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "SELECT 1 as test"
    });
    
    if (error) {
      console.error('exec_sql error:', error.message);
    } else {
      console.log('exec_sql works:', data);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

testExecSQL();