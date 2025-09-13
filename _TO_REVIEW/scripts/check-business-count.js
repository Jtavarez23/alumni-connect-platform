import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBusinessCount() {
  console.log('Checking business count directly...');
  
  try {
    // Check count directly from table (bypassing RPC)
    const { count, error } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Error checking business count:', error.message);
      return;
    }
    
    console.log('✅ Total businesses in database:', count);
    
    // Check with service role key (bypasses RLS)
    const serviceSupabase = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU');
    
    const { count: serviceCount, error: serviceError } = await serviceSupabase
      .from('businesses')
      .select('*', { count: 'exact', head: true });
    
    if (serviceError) {
      console.log('❌ Error checking with service role:', serviceError.message);
      return;
    }
    
    console.log('✅ Businesses with service role (bypass RLS):', serviceCount);
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkBusinessCount();