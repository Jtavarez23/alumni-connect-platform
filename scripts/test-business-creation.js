import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBusinessCreation() {
  console.log('Testing business creation...');
  
  try {
    // Test creating a business
    const { data, error } = await supabase
      .rpc('create_business', {
        p_name: 'Test Business',
        p_description: 'A test business for functionality testing',
        p_category: 'Technology',
        p_website: 'https://testbusiness.com',
        p_email: 'test@testbusiness.com',
        p_location: 'Test City, TS'
      });
    
    if (error) {
      console.log('❌ Business creation error:', error.message);
      return false;
    }
    
    console.log('✅ Business created successfully:', data);
    
    // Test getting businesses
    const { data: businesses, error: businessError } = await supabase
      .rpc('get_businesses', { p_limit: 10 });
    
    if (businessError) {
      console.log('❌ Error getting businesses:', businessError.message);
      return false;
    }
    
    console.log('✅ Businesses retrieved:', businesses?.businesses?.length || 0);
    
    return true;
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
    return false;
  }
}

testBusinessCreation().then(success => {
  console.log(success ? '🎉 Business creation test passed!' : '❌ Business creation test failed');
  process.exit(success ? 0 : 1);
});