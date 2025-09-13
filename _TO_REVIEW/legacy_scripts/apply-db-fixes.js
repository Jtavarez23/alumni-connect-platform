// Quick fix script to apply missing database schema
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read Supabase config from vite config or environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dyhloaxsdcfgfyfhrdfc.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseServiceKey) {
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFixes() {
  console.log('🔧 Applying database fixes for mentorship and face recognition...\n');
  
  try {
    // Read the SQL fix file
    const sqlContent = fs.readFileSync('./fix_missing_features.sql', 'utf8');
    
    // Split into individual statements and execute them
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      try {
        console.log('📝 Executing:', statement.substring(0, 50) + '...');
        const { data, error } = await supabase.rpc('exec_sql', { 
          query: statement + ';' 
        });
        
        if (error) {
          console.log('⚠️  Warning:', error.message);
          // Continue with other statements even if some fail
        } else {
          console.log('✅ Success');
        }
      } catch (err) {
        console.log('⚠️  Warning:', err.message);
        // Continue with other statements
      }
    }
    
    console.log('\n🎉 Database fixes application completed!');
    console.log('✅ Mentorship tables should now be available');
    console.log('✅ Face recognition schema should be ready');
    console.log('✅ Essential RPC functions should be created');
    console.log('\n🔄 Please refresh your application to see the changes.');
    
  } catch (error) {
    console.error('❌ Error applying fixes:', error.message);
    
    // Try a simpler approach - just create the essential tables directly
    console.log('\n🔄 Trying alternative approach...');
    
    const essentialQueries = [
      `CREATE TABLE IF NOT EXISTS public.mentorship_profiles (
        user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        role text DEFAULT 'both',
        topics text[],
        availability jsonb DEFAULT '{}',
        created_at timestamptz DEFAULT now()
      );`,
      
      `CREATE TABLE IF NOT EXISTS public.mentorship_matches (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        mentor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        mentee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        status text DEFAULT 'suggested',
        created_at timestamptz DEFAULT now()
      );`,
      
      `ALTER TABLE public.mentorship_profiles ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE public.mentorship_matches ENABLE ROW LEVEL SECURITY;`,
    ];
    
    for (const query of essentialQueries) {
      try {
        const { data, error } = await supabase.rpc('exec_sql', { query });
        if (error) {
          console.log('⚠️ ', error.message);
        } else {
          console.log('✅ Essential table created');
        }
      } catch (err) {
        console.log('⚠️ ', err.message);
      }
    }
  }
}

applyFixes().catch(console.error);