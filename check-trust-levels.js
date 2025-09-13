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

async function checkTrustLevels() {
  try {
    console.log('🔍 Checking trust_level enum values...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "SELECT unnest(enum_range(NULL::trust_level)) as trust_level"
    });
    
    if (error) {
      console.error('Error checking trust levels:', error.message);
      
      // Try a different approach
      const { data: sampleData } = await supabase.rpc('exec_sql', {
        sql: "SELECT DISTINCT trust_level FROM profiles LIMIT 10"
      });
      
      console.log('Sample trust_level values from profiles:', sampleData);
      
    } else {
      console.log('Available trust_level values:', data);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

checkTrustLevels();