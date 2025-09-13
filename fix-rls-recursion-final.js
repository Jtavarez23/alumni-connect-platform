import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixRLSRecursion() {
  console.log('🔧 Fixing RLS Infinite Recursion Issues...\n');
  
  try {
    // Step 1: Drop all existing problematic policies
    console.log('1. Dropping all existing RLS policies to start fresh...');
    
    const dropPoliciesSql = `
      -- Drop all existing policies on all tables
      DO $$ 
      DECLARE
          pol_name TEXT;
          table_name TEXT;
      BEGIN
          -- Drop policies on profiles table
          FOR pol_name IN 
            SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
          LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON public.profiles';
          END LOOP;
          
          -- Drop policies on user_education table
          FOR pol_name IN 
            SELECT policyname FROM pg_policies WHERE tablename = 'user_education' AND schemaname = 'public'
          LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON public.user_education';
          END LOOP;
          
          -- Drop policies on connections table
          FOR pol_name IN 
            SELECT policyname FROM pg_policies WHERE tablename = 'connections' AND schemaname = 'public'
          LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON public.connections';
          END LOOP;
          
          -- Drop policies on events table
          FOR pol_name IN 
            SELECT policyname FROM pg_policies WHERE tablename = 'events' AND schemaname = 'public'
          LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON public.events';
          END LOOP;
          
          -- Drop policies on mentorship_profiles table
          FOR pol_name IN 
            SELECT policyname FROM pg_policies WHERE tablename = 'mentorship_profiles' AND schemaname = 'public'
          LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON public.mentorship_profiles';
          END LOOP;
          
          -- Drop policies on moderation_reports table
          FOR pol_name IN 
            SELECT policyname FROM pg_policies WHERE tablename = 'moderation_reports' AND schemaname = 'public'
          LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON public.moderation_reports';
          END LOOP;
          
          RAISE NOTICE 'All existing policies dropped successfully';
      END $$;
    `;
    
    const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropPoliciesSql });
    if (dropError) {
      console.error('Error dropping policies:', dropError.message);
      return;
    }
    console.log('✅ All existing policies dropped');
    
    // Step 2: Create security definer helper functions
    console.log('2. Creating security definer helper functions...');
    
    const helperFunctionsSql = `
      -- Helper function to check if users are connected
      CREATE OR REPLACE FUNCTION public.are_users_connected(user1_id UUID, user2_id UUID)
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM public.connections 
          WHERE (
            (user_id = user1_id AND connection_id = user2_id AND status = 'accepted') OR
            (user_id = user2_id AND connection_id = user1_id AND status = 'accepted')
          )
        );
      END;
      $$;
      
      -- Helper function to check if users share a school
      CREATE OR REPLACE FUNCTION public.users_share_school(user1_id UUID, user2_id UUID)
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM public.user_education ue1
          JOIN public.user_education ue2 ON ue1.school_id = ue2.school_id
          WHERE ue1.user_id = user1_id AND ue2.user_id = user2_id
        );
      END;
      $$;
      
      -- Helper function to check if user is moderator
      CREATE OR REPLACE FUNCTION public.is_user_moderator(user_id UUID)
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = user_id AND admin_role IN ('moderator', 'admin', 'super_admin')
        );
      END;
      $$;
      
      -- Grant execute permissions
      GRANT EXECUTE ON FUNCTION public.are_users_connected TO authenticated;
      GRANT EXECUTE ON FUNCTION public.users_share_school TO authenticated;
      GRANT EXECUTE ON FUNCTION public.is_user_moderator TO authenticated;
      GRANT EXECUTE ON FUNCTION public.are_users_connected TO anon;
      GRANT EXECUTE ON FUNCTION public.users_share_school TO anon;
      GRANT EXECUTE ON FUNCTION public.is_user_moderator TO anon;
    `;
    
    const { error: functionsError } = await supabase.rpc('exec_sql', { sql: helperFunctionsSql });
    if (functionsError) {
      console.error('Error creating helper functions:', functionsError.message);
      return;
    }
    console.log('✅ Security definer helper functions created');
    
    // Step 3: Create non-recursive RLS policies
    console.log('3. Creating non-recursive RLS policies...');
    
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
      
      -- Events policies (NO RECURSION)
      CREATE POLICY "events_own_all" ON public.events
        FOR ALL USING (created_by = auth.uid());
        
      CREATE POLICY "events_school_select" ON public.events
        FOR SELECT USING (
          created_by != auth.uid() AND
          public.users_share_school(auth.uid(), created_by)
        );
        
      CREATE POLICY "events_public_select" ON public.events
        FOR SELECT USING (
          is_public = true AND auth.uid() IS NOT NULL
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
    console.log('✅ Non-recursive RLS policies created');
    
    console.log('\n🎉 RLS recursion fix completed successfully!');
    console.log('\n📋 Summary of changes:');
    console.log('- Dropped all existing recursive policies');
    console.log('- Created security definer helper functions');
    console.log('- Implemented non-recursive policies using helper functions');
    console.log('- Each table now has proper access controls without recursion');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

fixRLSRecursion();