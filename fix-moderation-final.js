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

async function fixModerationFinal() {
  try {
    console.log('🔧 Final fix for moderation policies...');
    
    // Fix moderation_reports policy - use security definer function
    const fixPolicy = `
      DROP POLICY IF EXISTS moderation_reports_read ON public.moderation_reports;
      DROP POLICY IF EXISTS moderation_reports_update ON public.moderation_reports;
      
      CREATE POLICY moderation_reports_read ON public.moderation_reports
        FOR SELECT USING (
          reporter_id = auth.uid() OR
          -- Use a simpler check for moderators to avoid recursion
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff', 'admin')
          )
        );
        
      CREATE POLICY moderation_reports_update ON public.moderation_reports
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff', 'admin')
          )
        );
    `;
    
    const { error: policyError } = await supabase.rpc('exec_sql', { sql: fixPolicy });
    if (policyError) {
      console.error('Error fixing moderation policy:', policyError.message);
    } else {
      console.log('✅ Moderation reports policy fixed');
    }
    
    console.log('✅ All moderation policies fixed successfully');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

fixModerationFinal();