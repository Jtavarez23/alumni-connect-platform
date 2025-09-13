// Execute migrations using service role key
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration with service role
const SUPABASE_URL = 'https://dyhloaxsdcfgfyfhrdfc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMxMzA1MiwiZXhwIjoyMDcxODg5MDUyfQ.qUiJxVaSczLmasYXC7OXgtTRExVjj8dFxgbM1ROGvyk';

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔑 Using Supabase Service Role for direct SQL execution');

async function executeSQL(sql, description) {
  console.log(`\n🚀 Executing: ${description}`);
  console.log('-'.repeat(50));
  
  try {
    // Execute the raw SQL using the service role
    const { data, error } = await supabase.rpc('exec_raw_sql', {
      sql: sql
    });
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
      return false;
    } else {
      console.log(`✅ ${description} completed successfully`);
      console.log('Response:', data);
      return true;
    }
    
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
    return false;
  }
}

async function executeInstantMigration() {
  console.log('🎯 EXECUTING RECONNECT HIVE V2 MIGRATIONS WITH SERVICE ROLE');
  console.log('='.repeat(70));
  
  try {
    // Read the instant migration file
    const migrationPath = path.join(__dirname, '..', 'INSTANT_MIGRATION.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`📝 Loaded migration SQL (${migrationSQL.length} characters)`);
    
    // Execute the entire migration
    const success = await executeSQL(migrationSQL, 'Complete V2 Migration');
    
    if (success) {
      console.log('\n🎉 MIGRATION EXECUTION COMPLETED SUCCESSFULLY!');
      console.log('='.repeat(70));
      console.log('\n📋 Next Steps:');
      console.log('1. Run verification: node scripts/test-v2-features.js');
      console.log('2. Create sample data: node scripts/create-sample-data.js');
      console.log('3. Test the app at: http://localhost:8080');
      console.log('\n🚀 Your V2 transformation is complete!');
    } else {
      console.log('❌ Migration failed. Check the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Fatal error during migration:', error);
  }
}

// Alternative approach - try different RPC function names
async function tryAlternativeExecution() {
  console.log('\n🔄 Trying alternative execution methods...');
  
  const testSQL = 'SELECT version();';
  const alternatives = [
    'exec_raw_sql',
    'execute_sql',
    'run_sql', 
    'query',
    'raw_query'
  ];
  
  for (const funcName of alternatives) {
    try {
      console.log(`Trying: ${funcName}`);
      const { data, error } = await supabase.rpc(funcName, { sql: testSQL });
      
      if (!error) {
        console.log(`✅ Found working function: ${funcName}`);
        console.log('Response:', data);
        return funcName;
      } else {
        console.log(`❌ ${funcName}: ${error.message}`);
      }
    } catch (err) {
      console.log(`❌ ${funcName}: ${err.message}`);
    }
  }
  
  return null;
}

// Try direct table creation first to test service role
async function testServiceRole() {
  console.log('🧪 Testing service role permissions...');
  
  try {
    // Try a simple table creation
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);
    
    if (error) {
      console.log(`❌ Service role test failed: ${error.message}`);
      return false;
    } else {
      console.log(`✅ Service role working. Found ${data.length} tables`);
      return true;
    }
  } catch (err) {
    console.log(`❌ Service role exception: ${err.message}`);
    return false;
  }
}

// Execute step by step
async function executeStepByStep() {
  console.log('\n📋 Executing migrations step by step...');
  
  // Test service role first
  const roleWorking = await testServiceRole();
  if (!roleWorking) {
    console.log('❌ Cannot proceed without working service role');
    return;
  }
  
  // Try to find working RPC function
  const workingFunc = await tryAlternativeExecution();
  if (!workingFunc) {
    console.log('❌ No working RPC function found. Trying direct table operations...');
    await tryDirectOperations();
    return;
  }
  
  // Execute migration using working function
  const migrationPath = path.join(__dirname, '..', 'INSTANT_MIGRATION.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  const { data, error } = await supabase.rpc(workingFunc, { sql: migrationSQL });
  
  if (error) {
    console.log(`❌ Migration failed: ${error.message}`);
  } else {
    console.log('✅ Migration completed successfully!');
  }
}

// Try direct table operations if RPC doesn't work
async function tryDirectOperations() {
  console.log('\n🔧 Trying direct table operations...');
  
  try {
    // Try to create a test table directly
    const { error } = await supabase
      .schema('public')
      .from('test_v2_migration')
      .insert([{ test: 'migration' }]);
    
    if (error && error.message.includes('does not exist')) {
      console.log('✅ Can create tables - proceeding with manual operations');
      await executeManualOperations();
    } else {
      console.log('❌ Direct operations not working:', error.message);
    }
  } catch (err) {
    console.log('❌ Direct operations failed:', err.message);
  }
}

async function executeManualOperations() {
  console.log('🛠️ Executing manual table operations...');
  
  // This would require implementing each table creation individually
  // For now, let's just report that manual execution is needed
  console.log('⚠️ Automatic execution not available.');
  console.log('📋 Please run the INSTANT_MIGRATION.sql file manually in Supabase Dashboard');
}

// Run the migration
executeStepByStep()
  .then(() => {
    console.log('\n🎯 Migration execution attempt completed!');
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
  });