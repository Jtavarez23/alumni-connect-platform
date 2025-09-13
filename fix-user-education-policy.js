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

async function fixUserEducationPolicy() {
  try {
    console.log('🔧 Fixing user_education policy with security definer...');
    
    // First check if security definer functions exist
    const { error: checkError } = await supabase.rpc('exec_sql', {
      sql: "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'get_user_school_id'"
    });
    
    if (checkError) {
      console.log('Security definer functions not found, creating them...');
      await createSecurityDefinerFunctions();
    } else {
      console.log('Security definer functions already exist');
    }
    
    // Now fix the user_education policy to use the function
    const fixPolicy = `
      DROP POLICY IF EXISTS user_education_select ON public.user_education;
      
      CREATE POLICY user_education_select ON public.user_education
        FOR SELECT USING (
          user_id = auth.uid() OR
          (
            -- Use the security definer function instead of direct query
            school_id = (SELECT get_user_school_id()) AND
            EXISTS (
              SELECT 1 FROM public.connections c 
              WHERE (
                (c.user_id = auth.uid() AND c.connection_id = user_education.user_id AND c.status = 'accepted') OR
                (c.user_id = user_education.user_id AND c.connection_id = auth.uid() AND c.status = 'accepted')
              )
            )
          )
        );
    `;
    
    const { error: policyError } = await supabase.rpc('exec_sql', { sql: fixPolicy });
    if (policyError) {
      console.error('Error fixing policy:', policyError.message);
    } else {
      console.log('✅ User education policy fixed with security definer function');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

async function createSecurityDefinerFunctions() {
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
    console.log('✅ Security definer functions created');
  }
}

fixUserEducationPolicy();