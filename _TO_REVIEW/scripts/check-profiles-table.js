import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfilesTable() {
  console.log('Checking profiles table structure...');
  
  try {
    // Get a sample profile to see the structure
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error checking profiles table:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Profiles table structure:');
      console.log('Columns:', Object.keys(data[0]));
    } else {
      console.log('ℹ️  No profiles found, but table exists');
    }
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkProfilesTable();