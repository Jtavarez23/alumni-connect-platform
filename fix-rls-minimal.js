import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixRLSMinimal() {
  console.log('🔧 Applying minimal RLS fix for known tables...\n');
  
  try {
    // Create policies only for tables we know exist
    console.log('Creating minimal non-recursive RLS policies...');
    
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
      
      -- Events policies (NO RECURSION)
      CREATE POLICY "events_own_all" ON public.events
        FOR ALL USING (created_by = auth.uid());
        
      CREATE POLICY "events_public_select" ON public.events
        FOR SELECT USING (
          visibility = 'public' AND auth.uid() IS NOT NULL
        );
    `;
    
    const { error: policiesError } = await supabase.rpc('exec_sql', { sql: policiesSql });
    if (policiesError) {
      console.error('Error creating policies:', policiesError.message);
      return;
    }
    console.log('✅ Minimal non-recursive RLS policies created successfully');
    
    console.log('\n🎉 Minimal RLS fix completed!');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

fixRLSMinimal();