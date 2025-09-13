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

async function verifyRpcParameters() {
  console.log('🔍 Verifying RPC function parameters...\n');
  
  const functionsToVerify = [
    {
      name: 'get_network_feed',
      testCases: [
        { params: { p_user_id: 'b99870dc-6821-4b7b-985b-02c0df497b69', p_limit: 5 }, description: 'Valid user ID with limit' },
        { params: { p_limit: 10 }, description: 'Default user ID (auth.uid())' },
        { params: { p_user_id: 'b99870dc-6821-4b7b-985b-02c0df497b69', p_cursor: new Date().toISOString(), p_limit: 3 }, description: 'With cursor timestamp' }
      ]
    },
    {
      name: 'get_for_you_feed', 
      testCases: [
        { params: { p_user_id: 'b99870dc-6821-4b7b-985b-02c0df497b69' }, description: 'Valid user ID' },
        { params: {}, description: 'Default parameters' }
      ]
    },
    {
      name: 'create_post',
      testCases: [
        { params: { 
          p_user_id: 'b99870dc-6821-4b7b-985b-02c0df497b69',
          p_content: 'Test post content',
          p_privacy_level: 'public'
        }, description: 'Valid post creation' }
      ]
    }
  ];
  
  for (const func of functionsToVerify) {
    console.log(`\n📋 Testing ${func.name}:`);
    console.log('─'.repeat(40));
    
    for (const testCase of func.testCases) {
      try {
        console.log(`   Testing: ${testCase.description}`);
        const { data, error } = await supabase.rpc(func.name, testCase.params);
        
        if (error) {
          if (error.message.includes('function') || error.message.includes('not found')) {
            console.log(`   ❌ FUNCTION NOT FOUND: ${error.message}`);
          } else if (error.message.includes('parameter') || error.message.includes('argument')) {
            console.log(`   ❌ PARAMETER ERROR: ${error.message}`);
          } else {
            console.log(`   ⚠️  OTHER ERROR: ${error.message}`);
          }
        } else {
          console.log(`   ✅ SUCCESS: Returned ${data ? (data.length || 'data') : 'no data'}`);
        }
        
      } catch (error) {
        console.log(`   ❌ EXCEPTION: ${error.message}`);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Get function definitions to verify parameters
  console.log('\n🔧 Checking function definitions...');
  console.log('─'.repeat(40));
  
  const functionNames = functionsToVerify.map(f => f.name);
  
  for (const funcName of functionNames) {
    try {
      const { error: defError } = await supabase.rpc('exec_sql', {
        sql: `SELECT pg_get_function_arguments(oid) as args, 
                     pg_get_function_result(oid) as result
              FROM pg_proc 
              WHERE proname = '${funcName}' 
              AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')`
      });
      
      if (!defError) {
        console.log(`   ${funcName}: Function definition available`);
      } else {
        console.log(`   ${funcName}: Cannot get definition - ${defError.message}`);
      }
      
    } catch (error) {
      console.log(`   ${funcName}: Error checking definition - ${error.message}`);
    }
  }
}

verifyRpcParameters();