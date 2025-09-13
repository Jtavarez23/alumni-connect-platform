import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dyhloaxsdcfgfyfhrdfc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMTMwNTIsImV4cCI6MjA3MTg4OTA1Mn0.eg_bc94ySXthS_A8_oIffrrsW4UcSSu5lEKOw89OIz0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('🔍 Checking yearbook-related tables...\n');

  // List of tables we need to check
  const tablesToCheck = [
    'yearbooks',
    'yearbook_pages', 
    'page_names_ocr',
    'page_faces'
  ];

  for (const tableName of tablesToCheck) {
    try {
      console.log(`📋 Checking table: ${tableName}`);
      
      // Try a simple select to see if table exists and is accessible
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1);

      if (error) {
        console.log(`❌ Table ${tableName}: ERROR - ${error.message}`);
        console.log(`   Code: ${error.code}, Details: ${error.details}`);
      } else {
        console.log(`✅ Table ${tableName}: EXISTS and accessible (${count || 0} total records)`);
        if (data && data.length > 0) {
          console.log(`   Sample structure:`, Object.keys(data[0]));
        }
      }
    } catch (err) {
      console.log(`❌ Table ${tableName}: EXCEPTION - ${err.message}`);
    }
    console.log();
  }

  // Now test the exact failing query from the console
  console.log('🧪 Testing the failing yearbook fetch query...\n');
  
  try {
    const { data, error } = await supabase
      .from('yearbooks')
      .select(`
        *,
        school:schools(id,name,location),
        uploader:profiles!uploaded_by(id,first_name,last_name,avatar_url),
        pages:yearbook_pages(
          id,
          page_number,
          tile_manifest,
          image_path,
          ocr_text:page_names_ocr(id,text,bbox),
          faces:page_faces(id,bbox,claimed_by)
        )
      `)
      .eq('id', 'bc70e102-0f63-4aa0-9c84-079bba46723b');

    if (error) {
      console.log('❌ Full yearbook query FAILED:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details: ${error.details}`);
    } else {
      console.log('✅ Full yearbook query SUCCESS');
      console.log(`   Records returned: ${data.length}`);
    }
  } catch (err) {
    console.log(`❌ Full yearbook query EXCEPTION: ${err.message}`);
  }

  console.log('\n🔧 RECOMMENDATION:');
  console.log('Based on the results above, we can identify which tables need to be created.');
}

checkTables().catch(console.error);