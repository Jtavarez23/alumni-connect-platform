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

async function checkRpcFunctions() {
  console.log('Checking RPC functions in detail...');
  
  const functionsToCheck = [
    { name: 'get_network_feed', params: { p_user_id: 'b99870dc-6821-4b7b-985b-02c0df497b69', p_cursor: null, p_limit: 10 } },
    { name: 'like_post', params: { post_id: '00000000-0000-0000-0000-000000000000', user_id: 'b99870dc-6821-4b7b-985b-02c0df497b69' } }
  ];
  
  for (const func of functionsToCheck) {
    try {
      console.log(`\nTesting ${func.name}...`);
      const { data, error } = await supabase.rpc(func.name, func.params);
      
      if (error) {
        if (error.message.includes('function') || error.message.includes('not found')) {
          console.log(`❌ ${func.name}: FUNCTION MISSING - ${error.message}`);
        } else if (error.message.includes('Could not choose the best candidate')) {
          console.log(`⚠️  ${func.name}: FUNCTION EXISTS but needs specific parameters`);
          
          // Try to get function definition
          const { error: defError } = await supabase.rpc('exec_sql', {
            sql: `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = '${func.name}'`
          });
          
          if (!defError) {
            console.log(`   ${func.name} function exists but requires specific parameters`);
          }
          
        } else {
          console.log(`⚠️  ${func.name}: FUNCTION EXISTS but error - ${error.message}`);
        }
      } else {
        console.log(`✅ ${func.name}: WORKS - returned ${data ? data.length || 'data' : 'no data'}`);
      }
      
    } catch (e) {
      console.log(`❌ ${func.name}: ERROR - ${e.message}`);
    }
  }
}

checkRpcFunctions();