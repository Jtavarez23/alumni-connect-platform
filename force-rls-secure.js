import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function forceRLSSecure() {
  console.log('🔒 Force RLS Security...\n');
  
  try {
    console.log('1. Revoking all permissions from anon and public roles...');
    
    const revokePermissionsSql = `
      -- Revoke all permissions from anon role
      REVOKE ALL PRIVILEGES ON public.profiles FROM anon;
      REVOKE ALL PRIVILEGES ON public.connections FROM anon;
      REVOKE ALL PRIVILEGES ON public.user_education FROM anon;
      REVOKE ALL PRIVILEGES ON public.events FROM anon;
      
      -- Revoke all permissions from public role
      REVOKE ALL PRIVILEGES ON public.profiles FROM public;
      REVOKE ALL PRIVILEGES ON public.connections FROM public;
      REVOKE ALL PRIVILEGES ON public.user_education FROM public;
      REVOKE ALL PRIVILEGES ON public.events FROM public;
      
      -- Force RLS (cannot be bypassed)
      ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
      ALTER TABLE public.connections FORCE ROW LEVEL SECURITY;
      ALTER TABLE public.user_education FORCE ROW LEVEL SECURITY;
      ALTER TABLE public.events FORCE ROW LEVEL SECURITY;
    `;
    
    const { error: revokeError } = await supabase.rpc('exec_sql', { sql: revokePermissionsSql });
    if (revokeError) {
      console.error('Error revoking permissions:', revokeError.message);
      return;
    }
    console.log('✅ Permissions revoked and RLS forced');
    
    console.log('2. Testing security after forced RLS...');
    
    const anonClient = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    
    // Test profiles access
    const { data: profilesData, error: profilesError } = await anonClient.from('profiles').select('id').limit(1);
    if (profilesError) {
      console.log('✅ Profiles secured:', profilesError.message);
    } else {
      console.log('❌ Profiles still accessible:', profilesData?.length || 0, 'records');
    }
    
    // Test events access  
    const { data: eventsData, error: eventsError } = await anonClient.from('events').select('id').limit(1);
    if (eventsError) {
      console.log('✅ Events secured:', eventsError.message);
    } else {
      console.log('❌ Events still accessible:', eventsData?.length || 0, 'records');
    }
    
    // Test connections access
    const { data: connectionsData, error: connectionsError } = await anonClient.from('connections').select('id').limit(1);
    if (connectionsError) {
      console.log('✅ Connections secured:', connectionsError.message);
    } else {
      console.log('❌ Connections still accessible:', connectionsData?.length || 0, 'records');
    }
    
    console.log('3. Testing service role access (should still work)...');
    
    // Test service role access
    const { data: serviceProfilesData, error: serviceProfilesError } = await supabase.from('profiles').select('id').limit(1);
    if (serviceProfilesError) {
      console.log('❌ Service role blocked:', serviceProfilesError.message);
    } else {
      console.log('✅ Service role works:', serviceProfilesData?.length || 0, 'records');
    }
    
    console.log('\n🔒 Force RLS security completed!');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

forceRLSSecure();