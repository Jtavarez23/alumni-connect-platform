// Script to check what RPC functions exist
import { createClient } from '@supabase/supabase-js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkFunctions() {
  try {
    console.log('Checking existing RPC functions...');
    
    // Try to call a simple function to see what's available
    const { data: functions, error } = await supabase
      .from('pg_proc')
      .select('proname')
      .ilike('proname', 'get_%')
      .limit(10);
    
    if (error) {
      console.error('Error checking functions:', error);
      return;
    }
    
    console.log('Available get_* functions:', functions);
    
  } catch (error) {
    console.error('Failed to check functions:', error);
  }
}

checkFunctions();