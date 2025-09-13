// Direct database fix using Supabase client
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dyhloaxsdcfgfyfhrdfc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjUzOTcwNDQsImV4cCI6MjA0MDk3MzA0NH0.RYcEOI8f3fL7ZnQkKIy-fGUm_cME0GJKnxCLFGqkIrI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDatabase() {
  console.log('🔧 Fixing database schema issues...\n');

  try {
    // Check if mentorship_profiles table exists
    const { data: profilesCheck, error: profilesError } = await supabase
      .from('mentorship_profiles')
      .select('count')
      .limit(1);

    if (profilesError && profilesError.code === 'PGRST116') {
      console.log('❌ mentorship_profiles table missing');
      
      // Create via RPC or direct SQL
      console.log('📝 Creating mentorship tables...');
      
      const createTablesSQL = `
        -- Create mentorship_profiles table
        CREATE TABLE IF NOT EXISTS public.mentorship_profiles (
          user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          role text CHECK (role IN ('mentor','mentee','both')) DEFAULT 'both',
          topics text[],
          availability jsonb DEFAULT '{}',
          bio text,
          years_experience integer,
          expertise text[],
          industry text,
          current_company text,
          school_id uuid,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );

        -- Create mentorship_matches table
        CREATE TABLE IF NOT EXISTS public.mentorship_matches (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          mentor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
          mentee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
          status text CHECK (status IN ('suggested','pending','accepted','declined','ended')) DEFAULT 'suggested',
          match_score integer DEFAULT 0,
          message text,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );

        -- Enable RLS
        ALTER TABLE public.mentorship_profiles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.mentorship_matches ENABLE ROW LEVEL SECURITY;

        -- Create policies
        CREATE POLICY "Users can view all mentorship profiles" 
        ON public.mentorship_profiles FOR SELECT TO authenticated USING (true);
        
        CREATE POLICY "Users can manage their own mentorship profile" 
        ON public.mentorship_profiles FOR ALL TO authenticated 
        USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can view their mentorship matches" 
        ON public.mentorship_matches FOR SELECT TO authenticated 
        USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);
      `;

      // Try to execute SQL via RPC
      const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', {
        query: createTablesSQL
      });

      if (sqlError) {
        console.log('❌ Failed to create tables via RPC:', sqlError.message);
        
        // Alternative: Try creating minimal tables manually
        console.log('🔄 Trying alternative approach...');
        
        // Since we can't create tables directly, let's at least create the RPC function
        const createFunctionSQL = `
          CREATE OR REPLACE FUNCTION get_mentorship_matches(p_user_id uuid DEFAULT NULL)
          RETURNS json
          LANGUAGE sql STABLE SECURITY DEFINER
          AS $$
            SELECT '{"message": "Mentorship tables not found. Please create them via SQL editor."}'::json;
          $$;
        `;

        const { data: funcResult, error: funcError } = await supabase.rpc('exec_sql', {
          query: createFunctionSQL
        });

        if (funcError) {
          console.log('❌ Could not create function either:', funcError.message);
          console.log('\n📋 Manual Steps Required:');
          console.log('1. Go to Supabase Dashboard → SQL Editor');
          console.log('2. Run the SQL commands from fix_missing_features.sql');
          console.log('3. Refresh the application');
        } else {
          console.log('✅ Created fallback function');
        }
      } else {
        console.log('✅ Tables created successfully!');
      }
    } else {
      console.log('✅ mentorship_profiles table exists');
    }

    // Check face recognition tables
    console.log('\n🔍 Checking face recognition schema...');
    
    const { data: facesCheck, error: facesError } = await supabase
      .from('page_faces')
      .select('count')
      .limit(1);

    if (facesError) {
      console.log('❌ page_faces table missing - yearbook processing not set up');
    } else {
      console.log('✅ Face recognition tables exist');
    }

    console.log('\n🎉 Database check completed!');
    console.log('🔄 Please refresh your application at http://localhost:8080');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Manual fix required:');
    console.log('1. Open Supabase Dashboard');
    console.log('2. Go to SQL Editor');  
    console.log('3. Execute the SQL from our migration files');
  }
}

fixDatabase();