import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function simpleRLSTest() {
  try {
    console.log('🧪 Simple RLS Test...');
    
    // Test 1: Anonymous user should be restricted
    console.log('1. Testing anonymous user access...');
    const { error: anonError } = await supabaseAnon.from('profiles').select('id').limit(1);
    
    if (anonError && anonError.message.includes('permission denied')) {
      console.log('✅ Anonymous user properly restricted');
    } else if (anonError) {
      console.log('⚠️  Anonymous user error:', anonError.message);
    } else {
      console.log('❌ Anonymous user can access profiles (RLS may not be working)');
    }
    
    // Test 2: Service role should bypass RLS
    console.log('2. Testing service role access...');
    const { error: adminError } = await supabaseAdmin.from('profiles').select('id').limit(1);
    
    if (adminError) {
      console.log('❌ Service role error:', adminError.message);
    } else {
      console.log('✅ Service role can access profiles (bypasses RLS)');
    }
    
    // Test 3: Test events table
    console.log('3. Testing events table access...');
    const { error: eventsError } = await supabaseAnon.from('events').select('id').limit(1);
    
    if (eventsError && eventsError.message.includes('permission denied')) {
      console.log('✅ Events table properly restricted for anonymous users');
    } else if (eventsError) {
      console.log('⚠️  Events table error:', eventsError.message);
    } else {
      console.log('❌ Events table may be accessible to anonymous users');
    }
    
    console.log('✅ Simple RLS test completed');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

simpleRLSTest();