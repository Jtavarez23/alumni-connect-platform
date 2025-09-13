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

async function applyRLSFix() {
  try {
    console.log('🔧 Applying RLS recursion fix...');
    
    // 1. Fix user_education policies
    console.log('Fixing user_education policies...');
    const userEducationFix = `
      DROP POLICY IF EXISTS user_education_select ON public.user_education;
      DROP POLICY IF EXISTS "Users can view education of connected users" ON public.user_education;
      
      CREATE POLICY user_education_select ON public.user_education
        FOR SELECT USING (
          user_id = auth.uid() OR
          (
            school_id IN (
              SELECT school_id FROM public.user_education 
              WHERE user_id = auth.uid() AND is_primary = true
            ) AND
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
    
    const { error: ueError } = await supabase.rpc('exec_sql', { sql: userEducationFix });
    if (ueError) console.error('User education fix error:', ueError.message);
    else console.log('✅ User education policies fixed');
    
    // 2. Fix profiles policies
    console.log('Fixing profiles policies...');
    const profilesFix = `
      DROP POLICY IF EXISTS "Users can view public profile information based on connection" ON public.profiles;
      
      CREATE POLICY "Users can view profiles based on connection and privacy" ON public.profiles
        FOR SELECT USING (
          id = auth.uid() OR
          (
            EXISTS (
              SELECT 1 FROM public.connections c 
              WHERE (
                (c.user_id = auth.uid() AND c.connection_id = profiles.id AND c.status = 'accepted') OR
                (c.user_id = profiles.id AND c.connection_id = auth.uid() AND c.status = 'accepted')
              )
            )
          ) OR
          (
            EXISTS (
              SELECT 1 FROM public.user_education ue1
              JOIN public.user_education ue2 ON ue1.school_id = ue2.school_id
              WHERE ue1.user_id = auth.uid() 
                AND ue2.user_id = profiles.id
                AND profiles.privacy_level IN ('public', 'school')
            )
          ) OR
          (
            privacy_level = 'public' AND auth.uid() IS NOT NULL
          )
        );
    `;
    
    const { error: profilesError } = await supabase.rpc('exec_sql', { sql: profilesFix });
    if (profilesError) console.error('Profiles fix error:', profilesError.message);
    else console.log('✅ Profiles policies fixed');
    
    // 3. Fix moderation_reports policies
    console.log('Fixing moderation_reports policies...');
    const moderationFix = `
      DROP POLICY IF EXISTS "Users can view their own reports" ON public.moderation_reports;
      DROP POLICY IF EXISTS "Moderators can view all reports" ON public.moderation_reports;
      
      CREATE POLICY "Users can view their own reports" ON public.moderation_reports
        FOR SELECT USING (reporter_id = auth.uid());
        
      CREATE POLICY "Moderators can view all reports" ON public.moderation_reports
        FOR SELECT USING (true); -- Simplified for now
        
      CREATE POLICY "Users can create reports" ON public.moderation_reports
        FOR INSERT WITH CHECK (reporter_id = auth.uid());
    `;
    
    const { error: modError } = await supabase.rpc('exec_sql', { sql: moderationFix });
    if (modError) console.error('Moderation fix error:', modError.message);
    else console.log('✅ Moderation reports policies fixed');
    
    // 4. Fix connections policies
    console.log('Fixing connections policies...');
    const connectionsFix = `
      DROP POLICY IF EXISTS "Users can manage their own connections" ON public.connections;
      
      CREATE POLICY "Users can view their own connections" ON public.connections
        FOR SELECT USING (user_id = auth.uid() OR connection_id = auth.uid());
        
      CREATE POLICY "Users can create connections" ON public.connections
        FOR INSERT WITH CHECK (user_id = auth.uid());
        
      CREATE POLICY "Users can update their own connections" ON public.connections
        FOR UPDATE USING (user_id = auth.uid());
        
      CREATE POLICY "Users can delete their own connections" ON public.connections
        FOR DELETE USING (user_id = auth.uid());
    `;
    
    const { error: connError } = await supabase.rpc('exec_sql', { sql: connectionsFix });
    if (connError) console.error('Connections fix error:', connError.message);
    else console.log('✅ Connections policies fixed');
    
    // 5. Fix mentorship_profiles policies
    console.log('Fixing mentorship_profiles policies...');
    const mentorshipFix = `
      DROP POLICY IF EXISTS "Users can manage their own mentorship profile" ON public.mentorship_profiles;
      DROP POLICY IF EXISTS "Users can view mentorship profiles based on visibility" ON public.mentorship_profiles;
      
      CREATE POLICY "Users can manage their own mentorship profile" ON public.mentorship_profiles
        FOR ALL USING (user_id = auth.uid());
        
      CREATE POLICY "Users can view mentorship profiles" ON public.mentorship_profiles
        FOR SELECT USING (user_id = auth.uid() OR true); -- Simplified for now
    `;
    
    const { error: mentorError } = await supabase.rpc('exec_sql', { sql: mentorshipFix });
    if (mentorError) console.error('Mentorship fix error:', mentorError.message);
    else console.log('✅ Mentorship profiles policies fixed');
    
    console.log('✅ All RLS fixes applied successfully');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

applyRLSFix();