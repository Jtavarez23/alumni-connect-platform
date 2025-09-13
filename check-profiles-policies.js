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

async function checkProfilesPolicies() {
  try {
    console.log('🔍 Checking all policies on profiles table...');
    
    // Use direct table access since exec_sql seems problematic
    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, qual')
      .eq('tablename', 'profiles');
    
    if (error) {
      console.error('Error checking policies:', error.message);
      
      // Alternative approach using exec_sql
      const { error: sqlError } = await supabase.rpc('exec_sql', {
        sql: "SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'profiles'"
      });
      
      if (sqlError) {
        console.error('Error with exec_sql:', sqlError.message);
      }
      
    } else {
      console.log('Policies on profiles table:');
      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          console.log(`- ${policy.policyname}: ${policy.cmd} - ${policy.qual}`);
        });
      } else {
        console.log('No policies found on profiles table');
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

checkProfilesPolicies();