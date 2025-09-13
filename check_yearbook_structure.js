import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dyhloaxsdcfgfyfhrdfc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMTMwNTIsImV4cCI6MjA3MTg4OTA1Mn0.eg_bc94ySXthS_A8_oIffrrsW4UcSSu5lEKOw89OIz0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  console.log('🔍 Checking yearbook table structure and relationships...\n');

  // First let's create a test yearbook record to see the structure
  try {
    console.log('📋 Inserting test yearbook record to see structure...');
    
    const testYearbook = {
      id: '00000000-0000-0000-0000-000000000001', // Use a test UUID
      school_id: 'c9052f67-a349-4f89-8e02-e0fc453fc09c',
      uploaded_by: 'b99870dc-6821-4b7b-985b-02c0df497b69', // This should match the user_id
      title: 'Test Yearbook Structure Check',
      class_year: 2023,
      file_path: 'test/path.jpg',
      status: 'processing'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('yearbooks')
      .insert(testYearbook)
      .select('*');

    if (insertError) {
      console.log(`❌ Insert failed: ${insertError.message}`);
      console.log(`   Code: ${insertError.code}`);
      console.log(`   Details: ${insertError.details}`);
    } else {
      console.log('✅ Insert successful. Table structure:');
      console.log(Object.keys(insertData[0]));
      console.log('Full record:', insertData[0]);
    }
  } catch (err) {
    console.log(`❌ Insert exception: ${err.message}`);
  }

  console.log('\n📋 Now testing different relationship patterns...\n');

  // Test different ways to reference the relationship
  const relationshipTests = [
    {
      name: 'uploaded_by (original attempt)',
      query: 'uploader:profiles!uploaded_by(id,first_name,last_name,avatar_url)'
    },
    {
      name: 'uploaded_by as direct foreign key',
      query: 'uploader:profiles(id,first_name,last_name,avatar_url)'
    },
    {
      name: 'profiles referenced by uploaded_by column',
      query: 'profiles!yearbooks_uploaded_by_fkey(id,first_name,last_name,avatar_url)'
    }
  ];

  for (const test of relationshipTests) {
    try {
      console.log(`🧪 Testing: ${test.name}`);
      
      const { data, error } = await supabase
        .from('yearbooks')
        .select(`
          id,
          title,
          ${test.query}
        `)
        .limit(1);

      if (error) {
        console.log(`❌ Failed: ${error.message}`);
      } else {
        console.log(`✅ Success: ${test.name}`);
        console.log(`   Data structure:`, data);
      }
    } catch (err) {
      console.log(`❌ Exception: ${err.message}`);
    }
    console.log();
  }

  // Clean up test record
  try {
    await supabase
      .from('yearbooks')
      .delete()
      .eq('id', '00000000-0000-0000-0000-000000000001');
    console.log('🧹 Cleaned up test record');
  } catch (err) {
    console.log(`⚠️ Could not clean up test record: ${err.message}`);
  }
}

checkTableStructure().catch(console.error);