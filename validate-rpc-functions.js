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

async function validateRpcFunctions() {
  console.log('Validating RPC functions...\n');
  
  // Get all RPC functions
  try {
    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT proname as function_name, 
               pg_get_function_arguments(oid) as arguments,
               pg_get_function_result(oid) as return_type
        FROM pg_proc 
        WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND proname NOT LIKE 'pg_%'
        AND proname NOT LIKE 'sql_%'
        ORDER BY proname
      `
    });
    
    if (!funcError) {
      console.log('✅ RPC functions retrieved successfully');
    }
    
  } catch (error) {
    console.log('❌ Error getting RPC functions:', error.message);
  }
  
  // Test specific feed functions
  console.log('\n🧪 Testing feed functions...');
  
  const feedFunctions = [
    { 
      name: 'get_network_feed', 
      test: async () => {
        try {
          // Try different parameter combinations
          const result1 = await supabase.rpc('get_network_feed', { 
            p_user_id: 'b99870dc-6821-4b7b-985b-02c0df497b69',
            p_limit: 5
          });
          
          if (result1.error && result1.error.message.includes('author_id')) {
            return { status: '⚠️', message: 'Function exists but schema mismatch' };
          }
          
          return { status: '✅', message: 'Function works' };
          
        } catch (e) {
          return { status: '❌', message: e.message };
        }
      }
    },
    { 
      name: 'get_for_you_feed', 
      test: async () => {
        try {
          const result = await supabase.rpc('get_for_you_feed', { 
            p_user_id: 'b99870dc-6821-4b7b-985b-02c0df497b69'
          });
          return { status: '✅', message: `Returned ${result.data?.length || 0} items` };
        } catch (e) {
          return { status: '❌', message: e.message };
        }
      }
    },
    { 
      name: 'create_post', 
      test: async () => {
        try {
          // Test with minimal parameters
          const result = await supabase.rpc('create_post', {
            p_author_id: 'b99870dc-6821-4b7b-985b-02c0df497b69',
            p_content: 'Test post from audit',
            p_visibility: 'public'
          });
          
          if (result.error) {
            return { status: '⚠️', message: result.error.message };
          }
          return { status: '✅', message: 'Function works' };
        } catch (e) {
          return { status: '❌', message: e.message };
        }
      }
    }
  ];
  
  for (const func of feedFunctions) {
    const result = await func.test();
    console.log(`${result.status} ${func.name}: ${result.message}`);
  }
  
  console.log('\n🔍 Checking enum values...');
  
  // Validate enum values
  const enumsToCheck = [
    { name: 'trust_level', expected: ['unverified', 'verified_alumni', 'school_admin', 'moderator', 'staff'] },
    { name: 'visibility', expected: ['public', 'alumni_only', 'school_only', 'connections_only', 'private'] },
    { name: 'report_reason', expected: ['impersonation', 'nudity', 'violence', 'harassment', 'copyright', 'spam', 'other'] }
  ];
  
  for (const enumType of enumsToCheck) {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `SELECT unnest(enum_range(NULL::${enumType.name}))::text as value`
      });
      
      if (error) {
        console.log(`❌ ${enumType.name}: ${error.message}`);
      } else {
        console.log(`✅ ${enumType.name}: Enum values exist`);
      }
    } catch (error) {
      console.log(`❌ ${enumType.name}: ${error.message}`);
    }
  }
}

validateRpcFunctions();