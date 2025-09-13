import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPolicies() {
  console.log('🔍 Checking current RLS policies...\n');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;`
  });
  
  if (error) {
    console.error('Error:', error.message);
  } else {
    let currentTable = '';
    data.forEach(policy => {
      if (policy.tablename !== currentTable) {
        currentTable = policy.tablename;
        console.log(`\n📋 ${policy.tablename}:`);
      }
      console.log(`  • ${policy.policyname} (${policy.cmd})`);
      if (policy.qual) {
        console.log(`    USING: ${policy.qual}`);
      }
    });
  }
}

checkPolicies();