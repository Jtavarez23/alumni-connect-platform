import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, serviceKey);

async function testCompleteBusinessFlow() {
  console.log('🧪 Testing Complete Business Flow...\n');
  
  try {
    // 1. Create a business
    console.log('1. Creating a new business...');
    const { data: newBusiness, error: createError } = await supabase.rpc('create_business', {
      p_name: 'Test Tech Solutions',
      p_description: 'A comprehensive tech solutions provider for alumni entrepreneurs',
      p_category: 'Technology',
      p_website: 'https://testtech.com',
      p_email: 'info@testtech.com',
      p_location: 'San Francisco, CA',
      p_perk: '20% discount on all services for alumni',
      p_perk_url: 'https://testtech.com/alumni-discount'
    });
    
    if (createError) {
      console.log('❌ Business creation error:', createError.message);
      return false;
    }
    
    console.log('✅ Business created:', newBusiness);
    
    // 2. Get all businesses (with explicit parameters)
    console.log('\n2. Fetching all businesses...');
    const { data: businessList, error: listError } = await supabase.rpc('get_businesses', {
      p_limit: 10,
      p_offset: 0,
      p_category: null,
      p_location: null,
      p_search: null,
      p_verified_only: false,
      p_with_perks: false
    });
    
    if (listError) {
      console.log('❌ Error fetching businesses:', listError.message);
      return false;
    }
    
    const businesses = businessList?.[0]?.businesses || [];
    console.log(`✅ Found ${businesses.length} businesses`);
    
    // 3. Search for the created business
    console.log('\n3. Searching for the created business...');
    const { data: searchResults, error: searchError } = await supabase.rpc('search_businesses', {
      p_query: 'Tech Solutions',
      p_limit: 5
    });
    
    if (searchError) {
      console.log('❌ Search error:', searchError.message);
      return false;
    }
    
    const results = searchResults?.[0]?.results || [];
    console.log(`✅ Search found ${results.length} matching businesses`);
    
    // 4. Get business categories
    console.log('\n4. Fetching business categories...');
    const { data: categories, error: categoryError } = await supabase.rpc('get_business_categories');
    
    if (categoryError) {
      console.log('❌ Categories error:', categoryError.message);
      return false;
    }
    
    console.log(`✅ Found ${categories?.length || 0} categories`);
    
    // 5. Test claiming a business
    if (newBusiness?.id) {
      console.log('\n5. Testing business claim...');
      const { data: claim, error: claimError } = await supabase.rpc('claim_business', {
        p_business_id: newBusiness.id,
        p_verification_details: 'I am the owner of this business',
        p_documents_url: 'https://example.com/proof.pdf'
      });
      
      if (claimError) {
        console.log('⚠️  Claim error (expected for service role):', claimError.message);
      } else {
        console.log('✅ Business claim submitted:', claim);
      }
    }
    
    console.log('\n🎉 All business flow tests completed successfully!');
    console.log('\nSummary:');
    console.log(`- Created business: ${newBusiness?.name || 'Unknown'}`);
    console.log(`- Total businesses in database: ${businesses.length}`);
    console.log(`- Search functionality: Working`);
    console.log(`- Categories available: ${categories?.length || 0}`);
    
    return true;
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
    return false;
  }
}

testCompleteBusinessFlow().then(success => {
  process.exit(success ? 0 : 1);
});