import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function enableRLSAndTest() {
  console.log('🔧 Enabling RLS on tables and testing...\n');
  
  try {
    // Step 1: Enable RLS on all tables
    console.log('1. Enabling RLS on all tables...');
    
    const enableRLSSql = `
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_education ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
      
      -- Also ensure other tables have RLS enabled if they exist
      DO $$ 
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mentorship_profiles' AND table_schema = 'public') THEN
          ALTER TABLE public.mentorship_profiles ENABLE ROW LEVEL SECURITY;
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'moderation_reports' AND table_schema = 'public') THEN
          ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'business_listings' AND table_schema = 'public') THEN
          ALTER TABLE public.business_listings ENABLE ROW LEVEL SECURITY;
        END IF;
      END $$;
    `;
    
    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: enableRLSSql });
    if (rlsError) {
      console.error('Error enabling RLS:', rlsError.message);
    } else {
      console.log('✅ RLS enabled on all tables');
    }
    
    // Step 2: Verify RLS status
    console.log('2. Verifying RLS status...');
    
    const checkRLSSql = `
      SELECT 
        schemaname, 
        tablename, 
        CASE WHEN pc.relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
      FROM pg_tables pt
      JOIN pg_class pc ON pc.relname = pt.tablename
      WHERE schemaname = 'public' 
        AND pt.tablename IN ('profiles', 'connections', 'user_education', 'events', 'mentorship_profiles', 'moderation_reports', 'business_listings')
      ORDER BY tablename;
    `;
    
    const { data: rlsStatus, error: statusError } = await supabase.rpc('exec_sql', { sql: checkRLSSql });
    if (statusError) {
      console.error('Error checking RLS status:', statusError.message);
    } else if (rlsStatus) {
      rlsStatus.forEach(table => {
        console.log(`  ${table.tablename}: ${table.rls_status}`);
      });
    }
    
    // Step 3: Test anonymous access
    console.log('3. Testing anonymous access after RLS fix...');
    
    const anonClient = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    
    // Test profiles
    const { data: profilesData, error: profilesError } = await anonClient.from('profiles').select('id').limit(1);
    if (profilesError) {
      console.log('✅ Profiles properly restricted:', profilesError.message);
    } else {
      console.log('❌ Profiles still accessible to anonymous users');
    }
    
    // Test events
    const { data: eventsData, error: eventsError } = await anonClient.from('events').select('id').limit(1);
    if (eventsError) {
      console.log('✅ Events properly restricted:', eventsError.message);
    } else {
      console.log('❌ Events still accessible to anonymous users');
    }
    
    // Test connections
    const { data: connectionsData, error: connectionsError } = await anonClient.from('connections').select('id').limit(1);
    if (connectionsError) {
      console.log('✅ Connections properly restricted:', connectionsError.message);
    } else {
      console.log('❌ Connections still accessible to anonymous users');
    }
    
    console.log('\n🎉 RLS enable and test completed!');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

enableRLSAndTest();