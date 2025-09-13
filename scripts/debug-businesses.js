import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, serviceKey);

async function debugBusinesses() {
  console.log('Debugging businesses...');
  
  try {
    // Get all businesses with service role (bypasses RLS)
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*');
    
    if (error) {
      console.log('❌ Error getting businesses:', error.message);
      return;
    }
    
    console.log('✅ Businesses in database:', businesses?.length || 0);
    
    if (businesses && businesses.length > 0) {
      console.log('Business details:');
      businesses.forEach((b, i) => {
        console.log(`${i + 1}. ${b.name} (${b.category}) - ${b.verified ? 'Verified' : 'Not verified'}`);
      });
    }
    
    // Test the RPC function with service role
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('get_businesses', { p_limit: 10 });
    
    if (rpcError) {
      console.log('❌ RPC error:', rpcError.message);
      return;
    }
    
    console.log('✅ RPC result businesses:', rpcResult?.businesses?.length || 0);
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

debugBusinesses();