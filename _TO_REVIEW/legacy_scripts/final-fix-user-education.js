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

async function finalFixUserEducation() {
  try {
    console.log('🔧 Final fix for user_education policy...');
    
    // Fix the user_education policy to use security definer functions
    const fixPolicy = `
      DROP POLICY IF EXISTS user_education_select ON public.user_education;
      
      CREATE POLICY user_education_select ON public.user_education
        FOR SELECT USING (
          user_id = auth.uid() OR
          (
            -- Use the security definer function to avoid recursion
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
      console.error('Error fixing user_education policy:', policyError.message);
    } else {
      console.log('✅ User education policy fixed with security definer function');
    }
    
    // Also fix profiles policy to use security definer
    const fixProfilesPolicy = `
      DROP POLICY IF EXISTS "Users can view profiles based on connection and privacy" ON public.profiles;
      
      CREATE POLICY "Users can view profiles based on connection and privacy" ON public.profiles
        FOR SELECT USING (
          id = auth.uid() OR
          (
            -- Friends can see each other
            EXISTS (
              SELECT 1 FROM public.connections c 
              WHERE (
                (c.user_id = auth.uid() AND c.connection_id = profiles.id AND c.status = 'accepted') OR
                (c.user_id = profiles.id AND c.connection_id = auth.uid() AND c.status = 'accepted')
              )
            )
          ) OR
          (
            -- Same school users can see basic info if privacy allows
            (SELECT get_user_school_id()) IN (
              SELECT school_id FROM public.user_education WHERE user_id = profiles.id
            ) AND 
            profiles.privacy_level IN ('public', 'school')
          ) OR
          (
            -- Public profiles visible to all authenticated users
            privacy_level = 'public' AND auth.uid() IS NOT NULL
          )
        );
    `;
    
    const { error: profilesError } = await supabase.rpc('exec_sql', { sql: fixProfilesPolicy });
    if (profilesError) {
      console.error('Error fixing profiles policy:', profilesError.message);
    } else {
      console.log('✅ Profiles policy fixed with security definer function');
    }
    
    console.log('✅ All policies fixed successfully');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

finalFixUserEducation();