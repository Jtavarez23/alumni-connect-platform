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

async function checkAllPolicies() {
  try {
    console.log('🔍 Checking all policies on moderation_reports table...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'moderation_reports'"
    });
    
    if (error) {
      console.error('Error checking policies:', error.message);
    } else {
      console.log('Current policies on moderation_reports:');
      if (data && data.length > 0) {
        data.forEach(policy => {
          console.log(`- ${policy.policyname}: ${policy.cmd} - ${policy.qual}`);
        });
      } else {
        console.log('No policies found on moderation_reports table');
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

checkAllPolicies();