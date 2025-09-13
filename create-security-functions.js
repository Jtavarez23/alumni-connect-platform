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

async function createSecurityFunctions() {
  try {
    console.log('🔧 Creating security definer functions...');
    
    const createFunctionsSQL = `
      CREATE OR REPLACE FUNCTION get_user_school_id()
      RETURNS uuid
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = 'public'
      STABLE
      AS $$
        SELECT school_id FROM profiles WHERE id = auth.uid();
      $$;

      CREATE OR REPLACE FUNCTION get_user_privacy_level()
      RETURNS text
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = 'public'
      STABLE
      AS $$
        SELECT privacy_level FROM profiles WHERE id = auth.uid();
      $$;
    `;
    
    const { error } = await supabase.rpc('exec_sql', { sql: createFunctionsSQL });
    if (error) {
      console.error('Error creating security definer functions:', error.message);
    } else {
      console.log('✅ Security definer functions created successfully');
      
      // Test the functions
      console.log('🧪 Testing functions...');
      const { data: schoolData } = await supabase.rpc('get_user_school_id');
      const { data: privacyData } = await supabase.rpc('get_user_privacy_level');
      
      console.log('get_user_school_id result:', schoolData);
      console.log('get_user_privacy_level result:', privacyData);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

createSecurityFunctions();