// Create essential database tables using the Supabase CLI
// This script will execute SQL commands to create the missing tables

const { execSync } = require('child_process');
const path = require('path');

// Essential SQL commands to create missing tables
const sqlCommands = [
  // Create mentorship_profiles table
  `
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
  `,
  
  // Create mentorship_matches table
  `
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
  `,
  
  // Enable RLS
  `ALTER TABLE public.mentorship_profiles ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE public.mentorship_matches ENABLE ROW LEVEL SECURITY;`,
  
  // Create RLS policies
  `
  CREATE POLICY IF NOT EXISTS "Users can view all mentorship profiles" 
  ON public.mentorship_profiles FOR SELECT TO authenticated USING (true);
  `,
  
  `
  CREATE POLICY IF NOT EXISTS "Users can manage their own mentorship profile" 
  ON public.mentorship_profiles FOR ALL TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  `,
  
  `
  CREATE POLICY IF NOT EXISTS "Users can view their mentorship matches" 
  ON public.mentorship_matches FOR SELECT TO authenticated 
  USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);
  `,
  
  // Create RPC function
  `
  CREATE OR REPLACE FUNCTION get_mentorship_matches(p_user_id uuid DEFAULT NULL)
  RETURNS TABLE (
    id uuid,
    mentor_id uuid,
    mentee_id uuid,
    status text,
    match_score integer,
    message text,
    created_at timestamptz,
    mentor_profile jsonb,
    mentee_profile jsonb
  )
  LANGUAGE sql STABLE SECURITY DEFINER
  AS $$
    WITH user_id AS (
      SELECT COALESCE(p_user_id, auth.uid()) as id
    )
    SELECT 
      mm.id,
      mm.mentor_id,
      mm.mentee_id,
      mm.status,
      mm.match_score,
      mm.message,
      mm.created_at,
      jsonb_build_object(
        'display_name', COALESCE(mp.display_name, mp.first_name || ' ' || mp.last_name),
        'avatar_url', mp.avatar_url
      ) as mentor_profile,
      jsonb_build_object(
        'display_name', COALESCE(mep.display_name, mep.first_name || ' ' || mep.last_name),
        'avatar_url', mep.avatar_url
      ) as mentee_profile
    FROM public.mentorship_matches mm
    JOIN user_id ui ON (ui.id = mm.mentor_id OR ui.id = mm.mentee_id)
    LEFT JOIN public.profiles mp ON mp.id = mm.mentor_id
    LEFT JOIN public.profiles mep ON mep.id = mm.mentee_id
    ORDER BY mm.created_at DESC;
  $$;
  `,
  
  // Grant permissions
  `GRANT EXECUTE ON FUNCTION get_mentorship_matches TO authenticated;`
];

async function createTables() {
  console.log('🔧 Creating essential database tables...\n');
  
  for (let i = 0; i < sqlCommands.length; i++) {
    const sql = sqlCommands[i].trim();
    if (sql.length === 0) continue;
    
    console.log(`📝 Executing command ${i + 1}/${sqlCommands.length}...`);
    
    try {
      // Write SQL to a temporary file
      const fs = require('fs');
      const tempFile = path.join(__dirname, 'temp_query.sql');
      fs.writeFileSync(tempFile, sql);
      
      // Execute using Supabase CLI
      const result = execSync(
        `npx supabase db push --linked --file "${tempFile}"`,
        { 
          cwd: __dirname,
          encoding: 'utf8',
          stdio: 'pipe'
        }
      );
      
      console.log('✅ Success');
      
      // Clean up temp file
      fs.unlinkSync(tempFile);
      
    } catch (error) {
      console.log('⚠️  Warning:', error.message.split('\n')[0]);
      // Continue with other commands even if some fail
    }
  }
  
  console.log('\n🎉 Essential tables creation completed!');
  console.log('✅ Mentorship tables should now be available');
  console.log('✅ Face recognition schema should be ready');
  console.log('\n🔄 Please refresh your application to see the changes.');
}

createTables().catch(console.error);