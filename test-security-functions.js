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

async function testSecurityFunctions() {
  try {
    console.log('🧪 Testing security definer functions...');
    
    // Test get_user_school_id
    try {
      const { data: schoolData, error: schoolError } = await supabase.rpc('get_user_school_id');
      if (schoolError) {
        console.log('❌ get_user_school_id does not exist or failed:', schoolError.message);
      } else {
        console.log('✅ get_user_school_id works:', schoolData);
      }
    } catch (e) {
      console.log('❌ get_user_school_id not found');
    }
    
    // Test get_user_privacy_level
    try {
      const { data: privacyData, error: privacyError } = await supabase.rpc('get_user_privacy_level');
      if (privacyError) {
        console.log('❌ get_user_privacy_level does not exist or failed:', privacyError.message);
      } else {
        console.log('✅ get_user_privacy_level works:', privacyData);
      }
    } catch (e) {
      console.log('❌ get_user_privacy_level not found');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

testSecurityFunctions();