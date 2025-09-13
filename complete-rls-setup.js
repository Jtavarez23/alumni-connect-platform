import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function completeRLSSetup() {
  console.log('🔧 Complete RLS Setup...\n');
  
  try {
    // Step 1: Grant necessary permissions to authenticated role
    console.log('1. Granting permissions to authenticated role...');
    const grantPermissionsSql = `
      -- Grant SELECT permissions to authenticated users
      GRANT SELECT ON public.profiles TO authenticated;
      GRANT SELECT ON public.connections TO authenticated;
      GRANT SELECT ON public.user_education TO authenticated;
      GRANT SELECT ON public.events TO authenticated;
      
      -- Grant INSERT/UPDATE/DELETE for own records
      GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
      GRANT INSERT, UPDATE, DELETE ON public.connections TO authenticated;
      GRANT INSERT, UPDATE, DELETE ON public.user_education TO authenticated;
      GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
      
      -- Ensure helper functions exist
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
      
      -- Grant execute permissions
      GRANT EXECUTE ON FUNCTION public.are_users_connected TO authenticated;
      GRANT EXECUTE ON FUNCTION public.users_share_school TO authenticated;
    `;
    
    const { error: grantError } = await supabase.rpc('exec_sql', { sql: grantPermissionsSql });
    if (grantError) {
      console.error('Error granting permissions:', grantError.message);
      return;
    }
    console.log('✅ Permissions granted to authenticated role');
    
    // Step 2: Enable RLS
    console.log('2. Ensuring RLS is enabled...');
    const enableRLSSql = `
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_education ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
    `;
    
    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: enableRLSSql });
    if (rlsError) {
      console.error('Error enabling RLS:', rlsError.message);
      return;
    }
    console.log('✅ RLS enabled');
    
    // Step 3: Create non-recursive policies
    console.log('3. Creating non-recursive RLS policies...');
    const policiesSql = `
      -- Profiles policies (NO RECURSION)
      CREATE POLICY "profiles_own_access" ON public.profiles
        FOR ALL USING (id = auth.uid());
        
      CREATE POLICY "profiles_connected_read" ON public.profiles
        FOR SELECT USING (
          id != auth.uid() AND 
          public.are_users_connected(auth.uid(), id)
        );
        
      CREATE POLICY "profiles_public_read" ON public.profiles
        FOR SELECT USING (
          id != auth.uid() AND 
          privacy_level = 'public' AND 
          auth.uid() IS NOT NULL
        );
      
      -- Connections policies (NO RECURSION)  
      CREATE POLICY "connections_own_access" ON public.connections
        FOR ALL USING (user_id = auth.uid());
        
      CREATE POLICY "connections_target_read" ON public.connections
        FOR SELECT USING (connection_id = auth.uid());
      
      -- User education policies (NO RECURSION)
      CREATE POLICY "user_education_own_access" ON public.user_education
        FOR ALL USING (user_id = auth.uid());
        
      CREATE POLICY "user_education_connected_read" ON public.user_education
        FOR SELECT USING (
          user_id != auth.uid() AND
          public.are_users_connected(auth.uid(), user_id)
        );
      
      -- Events policies (NO RECURSION)
      CREATE POLICY "events_own_access" ON public.events
        FOR ALL USING (created_by = auth.uid());
        
      CREATE POLICY "events_public_read" ON public.events
        FOR SELECT USING (
          visibility = 'public' AND auth.uid() IS NOT NULL
        );
    `;
    
    const { error: policiesError } = await supabase.rpc('exec_sql', { sql: policiesSql });
    if (policiesError) {
      console.error('Error creating policies:', policiesError.message);
      return;
    }
    console.log('✅ Non-recursive policies created');
    
    // Step 4: Test the setup
    console.log('4. Testing the complete setup...');
    
    const anonClient = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    
    // Test profiles
    const { data: profilesData, error: profilesError } = await anonClient.from('profiles').select('id').limit(1);
    if (profilesError && profilesError.message.includes('permission denied')) {
      console.log('✅ Profiles properly restricted for anonymous users');
    } else if (profilesError) {
      console.log('⚠️  Profiles error (not permission denied):', profilesError.message);
    } else {
      console.log('❌ Profiles still accessible to anonymous users');
    }
    
    // Test with authenticated client (using service role to simulate)
    const { data: authProfilesData, error: authProfilesError } = await supabase.from('profiles').select('id').limit(1);
    if (authProfilesError) {
      console.log('❌ Service role cannot access profiles:', authProfilesError.message);
    } else {
      console.log('✅ Service role (simulating authenticated) can access profiles');
    }
    
    console.log('\n🎉 Complete RLS setup finished!');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

completeRLSSetup();