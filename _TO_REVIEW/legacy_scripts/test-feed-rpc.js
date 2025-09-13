// Test script to verify feed RPC functions work correctly
import { createClient } from '@supabase/supabase-js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFeedRPC() {
  console.log('Testing feed RPC functions...\n');

  try {
    // Test get_network_feed
    console.log('1. Testing get_network_feed...');
    const { data: networkData, error: networkError } = await supabase
      .rpc('get_network_feed', { p_limit: 5 });
    
    if (networkError) {
      console.error('❌ Network feed error:', networkError);
    } else {
      console.log('✅ Network feed successful:', networkData?.items?.length || 0, 'posts found');
      if (networkData && networkData.items && networkData.items.length > 0) {
        console.log('   Sample post:', {
          id: networkData.items[0].id,
          text: networkData.items[0].content?.text?.substring(0, 50) + '...',
          author: networkData.items[0].author?.name
        });
      }
    }

    // Test get_for_you_feed (note: function name has underscore)
    console.log('\n2. Testing get_for_you_feed...');
    const { data: forYouData, error: forYouError } = await supabase
      .rpc('get_for_you_feed', { p_limit: 5 });
    
    if (forYouError) {
      console.error('❌ For You feed error:', forYouError);
    } else {
      console.log('✅ For You feed successful:', forYouData?.items?.length || 0, 'posts found');
      if (forYouData && forYouData.items && forYouData.items.length > 0) {
        console.log('   Sample post:', {
          id: forYouData.items[0].id,
          text: forYouData.items[0].content?.text?.substring(0, 50) + '...',
          author: forYouData.items[0].author?.name
        });
      }
    }

    console.log('\n✅ Feed RPC functions test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testFeedRPC();