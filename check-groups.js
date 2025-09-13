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

async function checkGroups() {
  console.log('Checking groups tables...');
  
  try {
    // Check if groups table exists using exec_sql
    const { error: groupsError } = await supabase.rpc('exec_sql', {
      sql: 'SELECT COUNT(*) FROM information_schema.tables WHERE table_name = \'groups\' AND table_schema = \'public\''
    });
    
    if (groupsError) {
      console.log('❌ groups table does not exist');
    } else {
      console.log('✅ groups table exists');
    }
    
    // Check if group_members table exists
    const { error: membersError } = await supabase.rpc('exec_sql', {
      sql: 'SELECT COUNT(*) FROM information_schema.tables WHERE table_name = \'group_members\' AND table_schema = \'public\''
    });
    
    if (membersError) {
      console.log('❌ group_members table does not exist');
    } else {
      console.log('✅ group_members table exists');
    }
    
    // Check the actual schema of groups if it exists
    const { error: schemaError } = await supabase.rpc('exec_sql', {
      sql: 'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'groups\' ORDER BY ordinal_position'
    });
    
    if (!schemaError) {
      console.log('\n📋 groups table schema:');
    }
    
  } catch (error) {
    console.error('Error checking groups:', error.message);
  }
}

checkGroups();