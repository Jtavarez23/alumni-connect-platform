import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function testAnonSimple() {
  try {
    console.log('🧪 Testing anonymous user with simple policy...');
    
    const { error } = await supabaseAnon.from('profiles').select('id').limit(1);
    
    if (error) {
      console.error('Anonymous user error:', error.message);
      if (error.message.includes('infinite recursion')) {
        console.log('❌ Infinite recursion still exists');
      } else if (error.message.includes('permission denied')) {
        console.log('✅ Permission denied (expected with RLS)');
      }
    } else {
      console.log('❌ Anonymous user can access profiles (RLS not working)');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

testAnonSimple();