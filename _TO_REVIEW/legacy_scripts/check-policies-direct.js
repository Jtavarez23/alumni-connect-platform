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

async function checkPoliciesDirect() {
  try {
    console.log('🔍 Checking policies directly...');
    
    // Check policies using pg_policies
    const sql = `
      SELECT 
        tablename,
        policyname,
        cmd,
        qual,
        with_check
      FROM pg_policies 
      WHERE tablename = 'profiles'
      ORDER BY policyname;
    `;
    
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error checking policies:', error.message);
      
      // Alternative: try to query pg_policies directly
      const sql2 = `
        SELECT policyname, tablename, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'profiles'
        ORDER BY policyname;
      `;
      
      const { error: error2 } = await supabase.rpc('exec_sql', { sql: sql2 });
      if (error2) {
        console.error('Error with pg_policies query:', error2.message);
      }
    } else {
      console.log('Policies found:', data);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

checkPoliciesDirect();