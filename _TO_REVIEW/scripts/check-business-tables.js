import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking if business tables exist...');
  
  try {
    // Check businesses table
    const { error: businessError } = await supabase
      .from('businesses')
      .select('count')
      .limit(1);
    
    if (businessError && businessError.code === '42P01') {
      console.log('❌ Businesses table does not exist');
    } else if (businessError) {
      console.log('❌ Error checking businesses table:', businessError.message);
    } else {
      console.log('✅ Businesses table exists');
    }
    
    // Check business_claims table
    const { error: claimsError } = await supabase
      .from('business_claims')
      .select('count')
      .limit(1);
    
    if (claimsError && claimsError.code === '42P01') {
      console.log('❌ Business_claims table does not exist');
    } else if (claimsError) {
      console.log('❌ Error checking business_claims table:', claimsError.message);
    } else {
      console.log('✅ Business_claims table exists');
    }
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkTables();