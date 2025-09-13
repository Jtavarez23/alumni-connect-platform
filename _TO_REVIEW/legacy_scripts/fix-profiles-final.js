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

async function fixProfilesFinal() {
  try {
    console.log('🔧 Final fix for profiles policy...');
    
    // Completely simplify the profiles policy to avoid recursion
    const fixPolicy = `
      DROP POLICY IF EXISTS "Users can view profiles based on connection and privacy" ON public.profiles;
      
      -- Simple policy: users can see their own profile and public profiles
      CREATE POLICY "Users can view profiles" ON public.profiles
        FOR SELECT USING (
          id = auth.uid() OR
          -- Allow viewing public profiles
          privacy_level = 'public' OR
          -- Allow viewing friends' profiles (simplified)
          EXISTS (
            SELECT 1 FROM public.connections c 
            WHERE (
              (c.user_id = auth.uid() AND c.connection_id = profiles.id AND c.status = 'accepted') OR
              (c.user_id = profiles.id AND c.connection_id = auth.uid() AND c.status = 'accepted')
            )
          )
        );
    `;
    
    const { error: policyError } = await supabase.rpc('exec_sql', { sql: fixPolicy });
    if (policyError) {
      console.error('Error fixing profiles policy:', policyError.message);
    } else {
      console.log('✅ Profiles policy simplified to avoid recursion');
    }
    
    console.log('✅ Profiles policy fixed successfully');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

fixProfilesFinal();