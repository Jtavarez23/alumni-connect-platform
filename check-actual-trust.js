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

async function checkActualTrustLevels() {
  try {
    console.log('🔍 Checking actual trust_level values in profiles...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "SELECT DISTINCT trust_level FROM profiles WHERE trust_level IS NOT NULL"
    });
    
    if (error) {
      console.error('Error checking trust levels:', error.message);
    } else {
      console.log('Actual trust_level values found:', data);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

checkActualTrustLevels();