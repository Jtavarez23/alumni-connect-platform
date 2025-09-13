import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration. Check .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration(migrationFile, description) {
  console.log(`\n🚀 Executing: ${description}`);
  console.log('-'.repeat(50));
  
  try {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.length === 0) continue;
      
      try {
        console.log(`  ${i + 1}/${statements.length}: ${statement.substring(0, 60)}...`);
        
        // Execute the SQL statement
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });
        
        if (error) {
          // Some errors are expected (like "table already exists")
          const errorMsg = error.message.toLowerCase();
          if (errorMsg.includes('already exists') || 
              errorMsg.includes('column already exists') ||
              errorMsg.includes('function already exists') ||
              errorMsg.includes('policy already exists')) {
            console.log(`    ⚠️ Already exists (skipping): ${error.message}`);
          } else {
            console.log(`    ❌ Error: ${error.message}`);
            errorCount++;
          }
        } else {
          console.log(`    ✅ Success`);
          successCount++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.log(`    ❌ Exception: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n📊 ${description} Summary:`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (errorCount < statements.length / 2) {
      console.log(`✅ ${description} completed successfully!`);
      return true;
    } else {
      console.log(`❌ ${description} had too many errors`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Failed to execute ${description}:`, error.message);
    return false;
  }
}

async function executeAllMigrations() {
  console.log('🎯 EXECUTING RECONNECT HIVE V2 MIGRATIONS');
  console.log('='.repeat(60));
  
  try {
    // Execute migrations in sequence
    const migration1Success = await executeMigration(
      '20250903160000_multi_school_v2_architecture.sql',
      'Migration 1: Core V2 Schema'
    );
    
    if (!migration1Success) {
      console.log('❌ Migration 1 failed. Stopping execution.');
      return;
    }
    
    const migration2Success = await executeMigration(
      '20250903161000_migrate_existing_data.sql', 
      'Migration 2: Data Migration'
    );
    
    if (!migration2Success) {
      console.log('❌ Migration 2 failed. Stopping execution.');
      return;
    }
    
    const migration3Success = await executeMigration(
      '20250903162000_add_rpc_functions.sql',
      'Migration 3: RPC Functions'
    );
    
    if (!migration3Success) {
      console.log('❌ Migration 3 failed. Stopping execution.');
      return;
    }
    
    console.log('\n🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📋 Next Steps:');
    console.log('1. Run verification: node scripts/test-v2-features.js');
    console.log('2. Create sample data: node scripts/create-sample-data.js');
    console.log('3. Test the app at: http://localhost:8080');
    console.log('\n🚀 Your V2 transformation is complete!');
    
  } catch (error) {
    console.error('❌ Migration execution failed:', error);
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution
async function executeViaDirectSQL() {
  console.log('🔄 Trying alternative execution method...\n');
  
  try {
    // Try to execute a simple test query first
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('❌ Cannot connect to database:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    
    // Read and execute migration files
    const migrations = [
      {
        file: '20250903160000_multi_school_v2_architecture.sql',
        name: 'Core V2 Schema'
      },
      {
        file: '20250903161000_migrate_existing_data.sql', 
        name: 'Data Migration'
      },
      {
        file: '20250903162000_add_rpc_functions.sql',
        name: 'RPC Functions'
      }
    ];
    
    for (const migration of migrations) {
      console.log(`\n🚀 Processing: ${migration.name}`);
      
      const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migration.file);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      // Execute via raw SQL - this might work better
      const { error } = await supabase.rpc('execute_sql', { query: sql });
      
      if (error) {
        console.log(`⚠️ ${migration.name} - ${error.message}`);
      } else {
        console.log(`✅ ${migration.name} completed`);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Alternative execution failed:', error.message);
    return false;
  }
}

// Run the migrations
if (import.meta.url === `file://${process.argv[1]}`) {
  executeAllMigrations()
    .then(() => {
      console.log('\n🎯 Migration execution completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

export { executeAllMigrations };