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

async function checkEnumDefinition() {
  try {
    console.log('🔍 Checking trust_level enum definition...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "SELECT pg_catalog.pg_enum.enumlabel FROM pg_catalog.pg_enum JOIN pg_catalog.pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'trust_level'"
    });
    
    if (error) {
      console.error('Error checking enum definition:', error.message);
      
      // Try alternative approach
      const { data: altData } = await supabase.rpc('exec_sql', {
        sql: "SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'trust_level'"
      });
      
      console.log('Enum values (alternative):', altData);
      
    } else {
      console.log('trust_level enum values:', data);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

checkEnumDefinition();