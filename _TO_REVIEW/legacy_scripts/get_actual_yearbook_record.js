import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dyhloaxsdcfgfyfhrdfc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMTMwNTIsImV4cCI6MjA3MTg4OTA1Mn0.eg_bc94ySXthS_A8_oIffrrsW4UcSSu5lEKOw89OIz0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getActualYearbookRecord() {
  console.log('🔍 Getting the actual yearbook record that was uploaded...\n');

  try {
    // Get the specific yearbook that was uploaded
    const { data, error } = await supabase
      .from('yearbooks')
      .select('*')
      .eq('id', 'bc70e102-0f63-4aa0-9c84-079bba46723b');

    if (error) {
      console.log(`❌ Failed to fetch yearbook: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details: ${error.details}`);
    } else if (data.length === 0) {
      console.log('❌ No yearbook found with that ID');
    } else {
      console.log('✅ Found yearbook record:');
      console.log('📊 Actual table structure:');
      console.log('   Columns:', Object.keys(data[0]));
      console.log('\n📄 Full record data:');
      console.log(JSON.stringify(data[0], null, 2));
    }
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
  }

  console.log('\n🔍 Also checking what columns the yearbooks table actually has...\n');
  
  try {
    // Try inserting with minimal data to see what's required/available
    const minimalTest = {
      id: '00000000-0000-0000-0000-000000000002',
      title: 'Structure Test'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('yearbooks')
      .insert(minimalTest)
      .select('*');

    if (insertError) {
      console.log(`❌ Minimal insert failed: ${insertError.message}`);
      console.log(`   This tells us about required columns`);
    } else {
      console.log('✅ Minimal insert worked. Available columns:');
      console.log(Object.keys(insertData[0]));
      
      // Clean up
      await supabase
        .from('yearbooks')
        .delete()
        .eq('id', '00000000-0000-0000-0000-000000000002');
    }
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
  }
}

getActualYearbookRecord().catch(console.error);