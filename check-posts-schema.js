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

async function checkPostsSchema() {
  console.log('🔍 Checking posts table structure...');
  
  try {
    // Check if posts table exists
    const { error: existsError } = await supabase.rpc('exec_sql', {
      sql: `SELECT COUNT(*) as table_count FROM information_schema.tables 
            WHERE table_name = 'posts' AND table_schema = 'public'`
    });
    
    if (existsError) {
      console.log('❌ Posts table might not exist');
    } else {
      console.log('✅ Posts table exists');
    }
    
    // Try a different approach to see table structure
    const { error: structureError } = await supabase.rpc('exec_sql', {
      sql: `SELECT * FROM posts LIMIT 0`
    });
    
    if (structureError) {
      console.log('❌ Cannot query posts structure:', structureError.message);
    } else {
      console.log('✅ Posts table can be queried');
    }
    
    // Let's check what depends on the posts table
    const { error: depsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          d.classid::regclass,
          d.objid::regclass,
          d.objsubid,
          d.refclassid::regclass,
          d.refobjid::regclass,
          d.refobjsubid,
          d.deptype
        FROM pg_depend d
        WHERE d.refobjid = 'posts'::regclass
          AND d.refclassid = 'pg_class'::regclass;
      `
    });
    
    if (depsError) {
      console.log('❌ Error checking dependencies:', depsError.message);
    }
    
    // Let's try to see what happens when we try to insert into the existing posts table
    const { error: insertError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Try to insert into posts with minimal required fields
        INSERT INTO public.posts (content, user_id)
        VALUES (
          'Test post for feed functionality',
          'b99870dc-6821-4b7b-985b-02c0df497b69'
        )
        ON CONFLICT DO NOTHING;
      `
    });
    
    if (insertError) {
      console.log('❌ Error inserting into posts table:', insertError.message);
    } else {
      console.log('✅ Successfully inserted into posts table');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkPostsSchema();