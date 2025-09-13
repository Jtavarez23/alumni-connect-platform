import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const { Client } = pkg;

async function directPGCheck() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('🔍 Direct PostgreSQL connection established');

    // Check RLS status
    console.log('1. Checking RLS status on profiles...');
    const rlsResult = await client.query(`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relname = 'profiles'
    `);
    console.log('RLS status:', rlsResult.rows);

    // Check all policies
    console.log('2. Checking all policies on profiles...');
    const policiesResult = await client.query(`
      SELECT policyname, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'profiles'
      ORDER BY policyname
    `);
    console.log('Policies found:', policiesResult.rows);

    // Check if there are any security definer functions
    console.log('3. Checking security definer functions...');
    const functionsResult = await client.query(`
      SELECT proname, prosecdef, prosrc 
      FROM pg_proc 
      WHERE prosecdef = true 
      AND (proname LIKE '%profile%' OR prosrc LIKE '%profile%')
    `);
    console.log('Security definer functions:', functionsResult.rows);

    // Check views
    console.log('4. Checking views...');
    const viewsResult = await client.query(`
      SELECT viewname, definition 
      FROM pg_views 
      WHERE definition LIKE '%profiles%'
      AND schemaname = 'public'
    `);
    console.log('Views:', viewsResult.rows);

    // Try to create a simple policy directly
    console.log('5. Creating simple policy directly...');
    await client.query('ALTER TABLE profiles DISABLE ROW LEVEL SECURITY');
    await client.query('DROP POLICY IF EXISTS \"direct_test\" ON public.profiles');
    await client.query('ALTER TABLE profiles ENABLE ROW LEVEL SECURITY');
    
    await client.query(`
      CREATE POLICY "direct_test" ON public.profiles
        FOR SELECT USING (false)
    `);
    console.log('✅ Direct policy created');

    // Test the policy
    console.log('6. Testing direct policy...');
    const testClient = new Client({
      connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await testClient.connect();
    const testResult = await testClient.query('SELECT id FROM profiles LIMIT 1');
    console.log('Test result:', testResult.rows);
    await testClient.end();

  } catch (error) {
    console.error('PostgreSQL error:', error.message);
  } finally {
    await client.end();
  }
}

// Only run if we have a direct database URL
if (process.env.DATABASE_URL || process.env.SUPABASE_DB_URL) {
  directPGCheck();
} else {
  console.log('No direct database URL found, skipping direct check');
}