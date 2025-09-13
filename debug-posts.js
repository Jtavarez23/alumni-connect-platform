import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugPosts() {
  console.log('🐛 Debugging posts table...');
  
  try {
    // Get actual posts table structure
    const { data: structureData, error: structureError } = await supabase.rpc('exec_sql', {
      sql: `SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'posts' 
            ORDER BY ordinal_position`
    });
    
    if (structureError) {
      console.log('❌ Cannot get posts structure:', structureError.message);
      return;
    } else if (structureData && structureData.length > 0) {
      console.log('📋 Posts table structure:');
      structureData.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }
    
    // Try to see what's actually in the posts table
    const { data: schemaData, error: sampleError } = await supabase.rpc('exec_sql', {
      sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'posts' ORDER BY ordinal_position`
    });
    
    if (sampleError) {
      console.log('❌ Cannot query posts schema:', sampleError.message);
    } else if (schemaData && schemaData.length > 0) {
      console.log('✅ Posts table columns:');
      schemaData.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('✅ Posts table schema retrieved (no columns found)');
    }
    
    // Let's try a different approach - use the supabase client directly
    const { data: posts, error: directError } = await supabase
      .from('posts')
      .select('*')
      .limit(1);
    
    if (directError) {
      console.log('❌ Direct query error:', directError.message);
      
      // The table might not exist or have different name
      const { error: tablesError } = await supabase.rpc('exec_sql', {
        sql: `SELECT table_name FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_name LIKE '%post%'`
      });
      
      if (!tablesError) {
        console.log('📋 Tables with "post" in name found');
      }
      
    } else {
      console.log('✅ Posts table accessible:', posts ? posts.length : 0, 'records');
      if (posts && posts.length > 0) {
        console.log('Sample post:', JSON.stringify(posts[0], null, 2));
      }
    }
    
    // Let's just create a simple test event instead
    console.log('\n🎯 Creating test event instead...');
    const { error: eventError } = await supabase.rpc('exec_sql', {
      sql: `
        INSERT INTO public.events (
          host_type, host_id, title, description, 
          starts_at, ends_at, location, is_virtual,
          visibility, created_by
        )
        SELECT 
          'school',
          (SELECT id FROM public.schools LIMIT 1),
          'Test Alumni Event',
          'Test event for system validation',
          now() + interval '2 days',
          now() + interval '2 days 2 hours',
          'Virtual',
          true,
          'alumni_only',
          'b99870dc-6821-4b7b-985b-02c0df497b69'
        WHERE NOT EXISTS (SELECT 1 FROM public.events WHERE title = 'Test Alumni Event');
        
        -- Add attendee
        INSERT INTO public.event_attendees (event_id, user_id, status)
        SELECT 
          e.id,
          'b99870dc-6821-4b7b-985b-02c0df497b69',
          'going'
        FROM public.events e
        WHERE e.title = 'Test Alumni Event'
        ON CONFLICT (event_id, user_id) DO NOTHING;
      `
    });
    
    if (eventError) {
      console.log('❌ Error creating test event:', eventError.message);
    } else {
      console.log('✅ Test event created successfully');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

debugPosts();