import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixRLSRecursionCorrected() {
  console.log('🔧 Applying corrected RLS policies...\n');
  
  try {
    // Create the corrected policies 
    console.log('Creating corrected non-recursive RLS policies...');
    
    const policiesSql = `
      -- Profiles policies (NO RECURSION)
      CREATE POLICY "profiles_own_select" ON public.profiles
        FOR SELECT USING (id = auth.uid());
        
      CREATE POLICY "profiles_own_update" ON public.profiles
        FOR UPDATE USING (id = auth.uid());
        
      CREATE POLICY "profiles_connected_select" ON public.profiles
        FOR SELECT USING (
          id != auth.uid() AND 
          public.are_users_connected(auth.uid(), id)
        );
        
      CREATE POLICY "profiles_school_public_select" ON public.profiles
        FOR SELECT USING (
          id != auth.uid() AND 
          privacy_level IN ('public', 'school') AND 
          public.users_share_school(auth.uid(), id)
        );
        
      CREATE POLICY "profiles_public_select" ON public.profiles
        FOR SELECT USING (
          id != auth.uid() AND 
          privacy_level = 'public' AND 
          auth.uid() IS NOT NULL
        );
      
      -- Connections policies (NO RECURSION)  
      CREATE POLICY "connections_own_all" ON public.connections
        FOR ALL USING (user_id = auth.uid());
        
      CREATE POLICY "connections_target_select" ON public.connections
        FOR SELECT USING (connection_id = auth.uid());
      
      -- User education policies (NO RECURSION)
      CREATE POLICY "user_education_own_all" ON public.user_education
        FOR ALL USING (user_id = auth.uid());
        
      CREATE POLICY "user_education_connected_select" ON public.user_education
        FOR SELECT USING (
          user_id != auth.uid() AND
          public.are_users_connected(auth.uid(), user_id)
        );
        
      CREATE POLICY "user_education_school_select" ON public.user_education
        FOR SELECT USING (
          user_id != auth.uid() AND
          public.users_share_school(auth.uid(), user_id)
        );
      
      -- Events policies (NO RECURSION) - using 'visibility' column
      CREATE POLICY "events_own_all" ON public.events
        FOR ALL USING (created_by = auth.uid());
        
      CREATE POLICY "events_school_select" ON public.events
        FOR SELECT USING (
          created_by != auth.uid() AND
          visibility IN ('school', 'public') AND
          public.users_share_school(auth.uid(), created_by)
        );
        
      CREATE POLICY "events_public_select" ON public.events
        FOR SELECT USING (
          visibility = 'public' AND auth.uid() IS NOT NULL
        );
      
      -- Mentorship profiles policies (NO RECURSION)
      CREATE POLICY "mentorship_own_all" ON public.mentorship_profiles
        FOR ALL USING (user_id = auth.uid());
        
      CREATE POLICY "mentorship_public_select" ON public.mentorship_profiles
        FOR SELECT USING (
          user_id != auth.uid() AND 
          visibility = 'public' AND 
          auth.uid() IS NOT NULL
        );
        
      CREATE POLICY "mentorship_school_select" ON public.mentorship_profiles
        FOR SELECT USING (
          user_id != auth.uid() AND 
          visibility = 'school' AND 
          public.users_share_school(auth.uid(), user_id)
        );
      
      -- Moderation reports policies (NO RECURSION)
      CREATE POLICY "moderation_own_select" ON public.moderation_reports
        FOR SELECT USING (reporter_id = auth.uid());
        
      CREATE POLICY "moderation_own_insert" ON public.moderation_reports
        FOR INSERT WITH CHECK (reporter_id = auth.uid());
        
      CREATE POLICY "moderation_moderator_all" ON public.moderation_reports
        FOR ALL USING (public.is_user_moderator(auth.uid()));
    `;
    
    const { error: policiesError } = await supabase.rpc('exec_sql', { sql: policiesSql });
    if (policiesError) {
      console.error('Error creating policies:', policiesError.message);
      return;
    }
    console.log('✅ Non-recursive RLS policies created successfully');
    
    console.log('\n🎉 RLS recursion fix completed successfully!');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

fixRLSRecursionCorrected();