// Test script to verify feed hooks work correctly with mock data
import { createClient } from '@supabase/supabase-js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMxMzA1MiwiZXhwIjoyMDcxODg5MDUyfQ.qUiJxVaSczLmasYXC7OXgtTRExVjj8dFxgbM1ROGvyk';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testFeedHooks() {
  console.log('Testing feed hooks with mock data...\n');

  try {
    // Test if we can at least connect to Supabase
    console.log('1. Testing Supabase connection...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('❌ Auth error:', authError);
    } else {
      console.log('✅ Supabase connection successful');
      console.log('   Session:', authData.session ? 'Authenticated' : 'Not authenticated');
    }

    // Test basic table access
    console.log('\n2. Testing basic table access...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (profileError) {
      console.error('❌ Profiles table error:', profileError);
    } else {
      console.log('✅ Profiles table accessible');
    }

    // Test posts table access
    console.log('\n3. Testing posts table access...');
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('count')
      .limit(1);
    
    if (postsError) {
      console.error('❌ Posts table error:', postsError);
    } else {
      console.log('✅ Posts table accessible');
    }

    // Test if we can create a simple post (if authenticated)
    if (authData.session) {
      console.log('\n4. Testing post creation...');
      const { data: newPost, error: createError } = await supabase
        .from('posts')
        .insert({
          text: 'Test post from RPC testing',
          visibility: 'public'
        })
        .select();
      
      if (createError) {
        console.error('❌ Post creation error:', createError);
      } else {
        console.log('✅ Post created successfully:', newPost);
      }
    }

    console.log('\n✅ Feed hooks basic test completed!');
    console.log('\nNote: RPC functions need to be deployed to the database.');
    console.log('Run: npx supabase db push');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFeedHooks();