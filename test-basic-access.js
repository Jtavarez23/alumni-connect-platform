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

async function testBasicAccess() {
  try {
    console.log('🧪 Testing basic table access...');
    
    // Try to access a basic table
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    
    if (error) {
      console.error('Error accessing profiles:', error.message);
    } else {
      console.log('Profiles table accessible:', data);
    }
    
    // Try events table
    const { data: eventsData, error: eventsError } = await supabase.from('events').select('*').limit(1);
    
    if (eventsError) {
      console.error('Error accessing events:', eventsError.message);
    } else {
      console.log('Events table accessible:', eventsData);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

testBasicAccess();