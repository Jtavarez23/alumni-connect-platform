import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dyhloaxsdcfgfyfhrdfc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMTMwNTIsImV4cCI6MjA3MTg4OTA1Mn0.eg_bc94ySXthS_A8_oIffrrsW4UcSSu5lEKOw89OIz0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixedYearbookQuery() {
  console.log('🧪 Testing fixed yearbook query (without uploaded_by relationship)...\n');

  try {
    // Test the fixed query pattern
    const { data, error } = await supabase
      .from('yearbooks')
      .select(`
        *,
        school:schools(id, name, location),
        pages:yearbook_pages(
          id,
          page_number,
          tile_manifest,
          image_path,
          ocr_text:page_names_ocr(id, text, bbox),
          faces:page_faces(id, bbox, claimed_by)
        )
      `)
      .eq('id', 'bc70e102-0f63-4aa0-9c84-079bba46723b');

    if (error) {
      console.log(`❌ Query failed: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details: ${error.details || 'No details'}`);
    } else {
      console.log('✅ SUCCESS: Query completed without errors!');
      console.log(`📊 Records returned: ${data.length}`);
      
      if (data.length > 0) {
        const yearbook = data[0];
        console.log('\n📄 Yearbook data structure:');
        console.log('   Main fields:', Object.keys(yearbook).filter(k => typeof yearbook[k] !== 'object'));
        console.log('   School data:', yearbook.school ? 'Present' : 'Not found');
        console.log('   Pages data:', yearbook.pages ? `${yearbook.pages.length} pages` : 'No pages');
        
        console.log('\n📋 Full yearbook record:');
        console.log(JSON.stringify(yearbook, null, 2));
      } else {
        console.log('ℹ️ No yearbook found with the specified ID');
      }
    }
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
  }

  console.log('\n🔍 Also testing basic yearbook table access...\n');
  
  try {
    // Test basic yearbook access
    const { data, error } = await supabase
      .from('yearbooks')
      .select('*')
      .limit(5);

    if (error) {
      console.log(`❌ Basic query failed: ${error.message}`);
    } else {
      console.log('✅ Basic yearbook access works');
      console.log(`📊 Total yearbooks accessible: ${data.length}`);
      if (data.length > 0) {
        console.log('   Available columns:', Object.keys(data[0]));
      }
    }
  } catch (err) {
    console.log(`❌ Basic query exception: ${err.message}`);
  }
  
  console.log('\n🎉 Testing complete!');
}

testFixedYearbookQuery().catch(console.error);