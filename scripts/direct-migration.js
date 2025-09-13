// Direct migration execution using fetch API
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim().replace(/"/g, '');
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_KEY = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('🚀 DIRECT MIGRATION EXECUTION');
console.log('URL:', SUPABASE_URL);

async function executeSQL(sql, description) {
  console.log(`\n📋 Executing: ${description}`);
  console.log('-'.repeat(40));
  
  try {
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 10 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      const preview = statement.substring(0, 60).replace(/\s+/g, ' ');
      
      console.log(`  ${i + 1}/${statements.length}: ${preview}...`);
      
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: statement })
        });
        
        if (response.ok) {
          console.log('    ✅ Success');
          successCount++;
        } else {
          const errorText = await response.text();
          if (errorText.toLowerCase().includes('already exists') ||
              errorText.toLowerCase().includes('duplicate')) {
            console.log('    ⚠️ Already exists (skipping)');
            skipCount++;
          } else {
            console.log(`    ❌ HTTP ${response.status}: ${errorText.substring(0, 100)}`);
            errorCount++;
          }
        }
        
      } catch (err) {
        console.log(`    ❌ Error: ${err.message}`);
        errorCount++;
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 ${description} Results:`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`⚠️ Skipped: ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    return { successCount, skipCount, errorCount };
    
  } catch (error) {
    console.error(`❌ Failed to process ${description}:`, error);
    return { successCount: 0, skipCount: 0, errorCount: 1 };
  }
}

async function runAllMigrations() {
  console.log('Starting migration execution...\n');
  
  const migrations = [
    '20250903160000_multi_school_v2_architecture.sql',
    '20250903161000_migrate_existing_data.sql', 
    '20250903162000_add_rpc_functions.sql'
  ];
  
  for (let i = 0; i < migrations.length; i++) {
    const migrationFile = migrations[i];
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
    
    console.log(`\n🚀 MIGRATION ${i + 1}/3: ${migrationFile}`);
    console.log('='.repeat(60));
    
    try {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      await executeSQL(sql, `Migration ${i + 1}`);
    } catch (error) {
      console.error(`❌ Failed to read ${migrationFile}:`, error);
    }
  }
  
  console.log('\n🎉 MIGRATION EXECUTION COMPLETED!');
  console.log('\n📋 Next Steps:');
  console.log('1. Run: node scripts/test-v2-features.js');
  console.log('2. Run: node scripts/create-sample-data.js');
  console.log('3. Visit: http://localhost:8080');
}

// Execute
runAllMigrations().catch(console.error);