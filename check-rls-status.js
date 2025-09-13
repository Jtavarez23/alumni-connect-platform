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

async function checkRLSStatus() {
  try {
    console.log('🔍 Checking RLS status for moderation_reports table...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'moderation_reports'"
    });
    
    if (error) {
      console.error('Error checking RLS status:', error.message);
    } else {
      console.log('RLS status for moderation_reports:');
      if (data && data.length > 0) {
        console.log(`Table: ${data[0].relname}, RLS enabled: ${data[0].relrowsecurity}`);
      } else {
        console.log('moderation_reports table not found');
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

checkRLSStatus();