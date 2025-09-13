import { Client } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection configuration
const client = new Client({
  connectionString: "postgresql://postgres.dyhloaxsdcfgfyfhrdfc:IG0YBGoKtdN8wdYU@aws-1-us-east-1.pooler.supabase.com:6543/postgres",
  ssl: {
    rejectUnauthorized: false
  }
});

async function executeSqlFile() {
  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully');

    // Read the SQL file
    const sqlFilePath = join(__dirname, 'verify_and_fix_social_proof_table.sql');
    const sqlContent = readFileSync(sqlFilePath, 'utf8');
    
    console.log('📄 Executing SQL script...\n');
    
    // Split the SQL content by semicolons to execute each statement separately
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const result = await client.query(statement + ';');
          
          // Display results for SELECT queries
          if (statement.toLowerCase().trim().startsWith('select')) {
            console.log(`📊 Query results:`);
            if (result.rows.length > 0) {
              console.table(result.rows);
            } else {
              console.log('   No rows returned');
            }
            console.log('');
          } else {
            console.log(`✅ Statement executed successfully: ${statement.substring(0, 50)}...`);
          }
          
          successCount++;
        } catch (error) {
          console.error(`❌ Error executing statement: ${statement.substring(0, 50)}...`);
          console.error(`   Error: ${error.message}\n`);
          errorCount++;
        }
      }
    }

    console.log(`\n📈 Execution Summary:`);
    console.log(`   ✅ Successful statements: ${successCount}`);
    console.log(`   ❌ Failed statements: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 All SQL statements executed successfully!');
      console.log('🔧 The social_proof_metrics table should now be accessible via the Supabase API.');
    } else {
      console.log('\n⚠️  Some statements failed. Please review the errors above.');
    }

  } catch (error) {
    console.error('💥 Database connection error:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Execute the function
executeSqlFile().catch(console.error);