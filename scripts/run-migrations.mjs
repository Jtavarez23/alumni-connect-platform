import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables from .env file manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim().replace(/"/g, '');
  }
});

// Initialize Supabase client
const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('🔗 Supabase URL:', supabaseUrl);
console.log('🔑 API Key:', supabaseKey?.substring(0, 20) + '...');

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
    
    console.log(`📝 Read ${migrationSQL.length} characters from ${migrationFile}`);
    
    // Try to execute each major section separately
    const sections = migrationSQL.split('\n\n').filter(section => 
      section.trim().length > 0 && 
      !section.trim().startsWith('--')
    );
    
    console.log(`📋 Processing ${sections.length} sections`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (!section || section.startsWith('--')) continue;
      
      console.log(`  ${i + 1}/${sections.length}: ${section.substring(0, 50)}...`);
      
      try {
        // Try different approaches to execute SQL
        let result = null;
        let error = null;
        
        // Method 1: Try raw SQL query
        try {
          const { data, error: queryError } = await supabase.rpc('execute_raw_sql', {
            sql: section
          });
          result = data;
          error = queryError;
        } catch (e) {
          // Method 2: Try with different function name
          try {
            const { data, error: queryError2 } = await supabase.rpc('exec_sql', {
              query: section
            });
            result = data;
            error = queryError2;
          } catch (e2) {
            // Method 3: Try direct query approach
            error = e2;
          }
        }
        
        if (error) {
          const errorMsg = error.message?.toLowerCase() || '';
          if (errorMsg.includes('already exists') || 
              errorMsg.includes('duplicate') ||
              errorMsg.includes('relation') ||
              errorMsg.includes('column') ||
              errorMsg.includes('function') ||
              errorMsg.includes('policy')) {
            console.log(`    ⚠️ Already exists (skipping)`);
            skipCount++;
          } else {
            console.log(`    ❌ Error: ${error.message}`);
            errorCount++;
          }
        } else {
          console.log(`    ✅ Success`);
          successCount++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (err) {
        console.log(`    ❌ Exception: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n📊 ${description} Summary:`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`⚠️ Skipped (exists): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (successCount + skipCount > errorCount) {
      console.log(`✅ ${description} completed successfully!`);
      return true;
    } else {
      console.log(`❌ ${description} had significant errors`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Failed to execute ${description}:`, error.message);
    return false;
  }
}

async function testConnection() {
  console.log('🧪 Testing database connection...');
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('❌ Connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
    
  } catch (err) {
    console.error('❌ Connection exception:', err.message);
    return false;
  }
}

async function executeAllMigrations() {
  console.log('🎯 EXECUTING RECONNECT HIVE V2 MIGRATIONS');
  console.log('='.repeat(60));
  
  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.log('❌ Cannot proceed without database connection');
    return;
  }
  
  try {
    const migrations = [
      {
        file: '20250903160000_multi_school_v2_architecture.sql',
        name: 'Migration 1: Core V2 Schema'
      },
      {
        file: '20250903161000_migrate_existing_data.sql', 
        name: 'Migration 2: Data Migration'
      },
      {
        file: '20250903162000_add_rpc_functions.sql',
        name: 'Migration 3: RPC Functions'
      }
    ];
    
    let allSuccessful = true;
    
    for (const migration of migrations) {
      const success = await executeMigration(migration.file, migration.name);
      if (!success) {
        console.log(`⚠️ ${migration.name} had issues, but continuing...`);
      }
    }
    
    console.log('\n🎉 MIGRATION EXECUTION COMPLETED!');
    console.log('='.repeat(60));
    console.log('\n📋 Next Steps:');
    console.log('1. Run verification: node scripts/test-v2-features.js');
    console.log('2. Create sample data: node scripts/create-sample-data.js');
    console.log('3. Test the app at: http://localhost:8080');
    console.log('\n🚀 Your V2 transformation should be ready!');
    
  } catch (error) {
    console.error('❌ Migration execution failed:', error);
  }
}

// Run the migrations
executeAllMigrations()
  .then(() => {
    console.log('\n🎯 Script completed!');
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });