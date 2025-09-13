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

async function fixMentorshipPolicy() {
  try {
    console.log('🔧 Fixing mentorship_profiles policy...');
    
    // Fix mentorship policy - simplified version
    const fixPolicy = `
      DROP POLICY IF EXISTS "Users can view mentorship profiles" ON public.mentorship_profiles;
      
      CREATE POLICY "Users can view mentorship profiles" ON public.mentorship_profiles
        FOR SELECT USING (
          user_id = auth.uid() OR
          -- Allow authenticated users to view mentorship profiles
          auth.uid() IS NOT NULL
        );
    `;
    
    const { error: policyError } = await supabase.rpc('exec_sql', { sql: fixPolicy });
    if (policyError) {
      console.error('Error fixing mentorship policy:', policyError.message);
    } else {
      console.log('✅ Mentorship profiles policy fixed');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

fixMentorshipPolicy();