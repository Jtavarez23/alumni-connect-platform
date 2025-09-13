// Test script for Business Directory functionality
// Tests the RPC functions and database schema

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBusinessFeatures() {
  console.log('🧪 Testing Business Directory Features...\n');

  try {
    // Test 1: Check if businesses table exists by trying to query it
    console.log('1. Checking businesses table...');
    const { data: tables, error: tableError } = await supabase
      .from('businesses')
      .select('count')
      .limit(1);

    if (tableError) {
      console.log('❌ Error checking tables:', tableError.message);
      return false;
    }

    if (tables.length === 0) {
      console.log('❌ Businesses table does not exist');
      return false;
    }
    console.log('✅ Businesses table exists');

    // Test 2: Check if business_claims table exists by trying to query it
    console.log('2. Checking business_claims table...');
    const { data: claimTables, error: claimTableError } = await supabase
      .from('business_claims')
      .select('count')
      .limit(1);

    if (claimTableError) {
      console.log('❌ Error checking claim tables:', claimTableError.message);
      return false;
    }

    if (claimTables.length === 0) {
      console.log('❌ Business_claims table does not exist');
      return false;
    }
    console.log('✅ Business_claims table exists');

    // Test 3: Test get_businesses RPC function
    console.log('3. Testing get_businesses RPC function...');
    const { data: businesses, error: businessError } = await supabase
      .rpc('get_businesses', { 
        p_limit: 5, 
        p_offset: 0,
        p_category: null,
        p_location: null,
        p_search: null,
        p_verified_only: false,
        p_with_perks: false
      });

    if (businessError) {
      console.log('❌ get_businesses RPC error:', businessError.message);
      return false;
    }

    console.log('✅ get_businesses RPC works');
    console.log('   Found businesses:', businesses?.businesses?.length || 0);

    // Test 4: Test search_businesses RPC function
    console.log('4. Testing search_businesses RPC function...');
    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_businesses', { 
        p_query: 'coffee',
        p_limit: 3
      });

    if (searchError) {
      console.log('❌ search_businesses RPC error:', searchError.message);
      return false;
    }

    console.log('✅ search_businesses RPC works');
    console.log('   Search results:', searchResults?.results?.length || 0);

    // Test 5: Test get_business_categories RPC function
    console.log('5. Testing get_business_categories RPC function...');
    const { data: categories, error: categoryError } = await supabase
      .rpc('get_business_categories');

    if (categoryError) {
      console.log('❌ get_business_categories RPC error:', categoryError.message);
      return false;
    }

    console.log('✅ get_business_categories RPC works');
    console.log('   Categories:', categories?.categories?.length || 0);

    console.log('\n🎉 All business directory tests passed!');
    console.log('\nThe business directory system is ready to use.');
    console.log('You can now:');
    console.log('1. Visit http://localhost:3000/businesses to browse businesses');
    console.log('2. Create new businesses at http://localhost:3000/businesses/create');
    console.log('3. Test the search and filtering functionality');

    return true;

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
    return false;
  }
}

// Run the tests
testBusinessFeatures().then(success => {
  process.exit(success ? 0 : 1);
});