import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, serviceKey);

async function testRpcDirectly() {
  console.log('Testing RPC function directly...');
  
  try {
    // Test with explicit parameters
    const { data, error } = await supabase
      .rpc('get_businesses', { 
        p_limit: 10, 
        p_offset: 0,
        p_category: null,
        p_location: null,
        p_search: null,
        p_verified_only: false,
        p_with_perks: false
      });
    
    if (error) {
      console.log('❌ RPC error:', error.message);
      return;
    }
    
    console.log('✅ RPC result:', JSON.stringify(data, null, 2));
    
    // Test a simpler query to see if the issue is with the JSONB aggregation
    const { data: simpleData, error: simpleError } = await supabase
      .from('businesses')
      .select('id, name, category')
      .limit(5);
    
    if (simpleError) {
      console.log('❌ Simple query error:', simpleError.message);
      return;
    }
    
    console.log('✅ Simple query result:', simpleData?.length || 0, 'businesses');
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testRpcDirectly();