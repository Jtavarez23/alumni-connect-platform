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

async function checkTableSchema() {
  try {
    console.log('🔍 Checking table schemas...');
    
    // Check business_listings columns
    console.log('1. Checking business_listings columns...');
    const { data: bizColumns, error: bizError } = await supabase
      .from('business_listings')
      .select('*')
      .limit(1);
    
    if (bizError) {
      console.error('Business listings error:', bizError.message);
    } else if (bizColumns && bizColumns.length > 0) {
      console.log('Business listings columns:', Object.keys(bizColumns[0]));
    }
    
    // Check user_education columns
    console.log('2. Checking user_education columns...');
    const { data: eduColumns, error: eduError } = await supabase
      .from('user_education')
      .select('*')
      .limit(1);
    
    if (eduError) {
      console.error('User education error:', eduError.message);
    } else if (eduColumns && eduColumns.length > 0) {
      console.log('User education columns:', Object.keys(eduColumns[0]));
    }
    
    // Check events columns for user_id
    console.log('3. Checking events columns...');
    const { data: eventColumns, error: eventError } = await supabase
      .from('events')
      .select('*')
      .limit(1);
    
    if (eventError) {
      console.error('Events error:', eventError.message);
    } else if (eventColumns && eventColumns.length > 0) {
      console.log('Events columns:', Object.keys(eventColumns[0]));
    }
    
    // Check available functions
    console.log('4. Checking available functions...');
    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql: "SELECT proname, proargtypes FROM pg_proc WHERE proname LIKE '%feed%'"
    });
    
    if (funcError) {
      console.error('Functions check error:', funcError.message);
    }
    
    // Check if connections table has data
    console.log('5. Checking connections data...');
    const { data: connData, error: connError } = await supabase
      .from('connections')
      .select('*');
    
    if (connError) {
      console.error('Connections error:', connError.message);
    } else {
      console.log('Connections count:', connData?.length || 0);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

checkTableSchema();