import { Client } from 'pg';

// Database connection configuration
const client = new Client({
  connectionString: "postgresql://postgres.dyhloaxsdcfgfyfhrdfc:IG0YBGoKtdN8wdYU@aws-1-us-east-1.pooler.supabase.com:6543/postgres",
  ssl: {
    rejectUnauthorized: false
  }
});

async function stepByStepFix() {
  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Step 1: Check if table exists in public schema
    console.log('📋 Step 1: Checking if table exists in public schema...');
    try {
      const result1 = await client.query(`
        SELECT table_name, table_schema 
        FROM information_schema.tables 
        WHERE table_name = 'social_proof_metrics';
      `);
      console.log('Current table existence:');
      console.table(result1.rows);
    } catch (error) {
      console.error('Error checking table existence:', error.message);
    }

    // Step 2: Check all schemas
    console.log('📋 Step 2: Checking all schemas for the table...');
    try {
      const result2 = await client.query(`
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE tablename = 'social_proof_metrics';
      `);
      console.log('All schema check:');
      console.table(result2.rows);
    } catch (error) {
      console.error('Error checking all schemas:', error.message);
    }

    // Step 3: Drop existing table if exists
    console.log('📋 Step 3: Dropping existing table...');
    try {
      await client.query('DROP TABLE IF EXISTS public.social_proof_metrics CASCADE;');
      await client.query('DROP TABLE IF EXISTS social_proof_metrics CASCADE;');
      console.log('✅ Tables dropped successfully');
    } catch (error) {
      console.error('Error dropping table:', error.message);
    }

    // Step 4: Create the table
    console.log('📋 Step 4: Creating social_proof_metrics table...');
    try {
      await client.query(`
        CREATE TABLE public.social_proof_metrics (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id uuid NOT NULL,
          school_id uuid NOT NULL,
          metric_type text NOT NULL,
          metric_value integer NOT NULL DEFAULT 0,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          UNIQUE(user_id, school_id, metric_type)
        );
      `);
      console.log('✅ Table created successfully');
    } catch (error) {
      console.error('❌ Error creating table:', error.message);
      return; // Exit if table creation fails
    }

    // Step 5: Set table owner
    console.log('📋 Step 5: Setting table owner...');
    try {
      await client.query('ALTER TABLE public.social_proof_metrics OWNER TO postgres;');
      console.log('✅ Table owner set successfully');
    } catch (error) {
      console.error('Error setting table owner:', error.message);
    }

    // Step 6: Disable RLS
    console.log('📋 Step 6: Disabling Row Level Security...');
    try {
      await client.query('ALTER TABLE public.social_proof_metrics DISABLE ROW LEVEL SECURITY;');
      console.log('✅ RLS disabled successfully');
    } catch (error) {
      console.error('Error disabling RLS:', error.message);
    }

    // Step 7: Grant permissions
    console.log('📋 Step 7: Granting permissions...');
    const roles = ['postgres', 'anon', 'authenticated', 'service_role'];
    for (const role of roles) {
      try {
        await client.query(`GRANT ALL ON public.social_proof_metrics TO ${role};`);
        console.log(`✅ Granted permissions to ${role}`);
      } catch (error) {
        console.error(`Error granting permissions to ${role}:`, error.message);
      }
    }

    // Step 8: Create indexes
    console.log('📋 Step 8: Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_social_proof_metrics_user_school ON public.social_proof_metrics(user_id, school_id);',
      'CREATE INDEX IF NOT EXISTS idx_social_proof_metrics_school ON public.social_proof_metrics(school_id);',
      'CREATE INDEX IF NOT EXISTS idx_social_proof_metrics_type ON public.social_proof_metrics(metric_type);'
    ];
    
    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery);
        console.log('✅ Index created successfully');
      } catch (error) {
        console.error('Error creating index:', error.message);
      }
    }

    // Step 9: Insert test data
    console.log('📋 Step 9: Inserting test data...');
    try {
      await client.query(`
        INSERT INTO public.social_proof_metrics (user_id, school_id, metric_type, metric_value)
        VALUES 
          ('b99870dc-6821-4b7b-985b-02c0df497b69'::uuid, 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid, 'connections', 23),
          ('b99870dc-6821-4b7b-985b-02c0df497b69'::uuid, 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid, 'posts', 12),
          ('b99870dc-6821-4b7b-985b-02c0df497b69'::uuid, 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid, 'yearbook_claims', 5),
          ('b99870dc-6821-4b7b-985b-02c0df497b69'::uuid, 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid, 'profile_views', 67)
        ON CONFLICT (user_id, school_id, metric_type) DO UPDATE SET
          metric_value = EXCLUDED.metric_value,
          updated_at = now();
      `);
      console.log('✅ Test data inserted successfully');
    } catch (error) {
      console.error('Error inserting test data:', error.message);
    }

    // Step 10: Verify table exists
    console.log('📋 Step 10: Final verification...');
    try {
      const result10 = await client.query(`
        SELECT table_schema, table_name, table_type 
        FROM information_schema.tables 
        WHERE table_name = 'social_proof_metrics';
      `);
      console.log('Final table verification:');
      console.table(result10.rows);
    } catch (error) {
      console.error('Error in final verification:', error.message);
    }

    // Step 11: Test the exact query
    console.log('📋 Step 11: Testing the exact query that was failing...');
    try {
      const result11 = await client.query(`
        SELECT * FROM public.social_proof_metrics 
        WHERE user_id = 'b99870dc-6821-4b7b-985b-02c0df497b69'::uuid 
          AND school_id = 'c9052f67-a349-4f89-8e02-e0fc453fc09c'::uuid;
      `);
      console.log('Query test results:');
      console.table(result11.rows);
    } catch (error) {
      console.error('Error testing query:', error.message);
    }

    // Step 12: Check permissions
    console.log('📋 Step 12: Checking final permissions...');
    try {
      const result12 = await client.query(`
        SELECT grantee, privilege_type 
        FROM information_schema.role_table_grants 
        WHERE table_name = 'social_proof_metrics' 
          AND table_schema = 'public';
      `);
      console.log('Table permissions:');
      console.table(result12.rows);
    } catch (error) {
      console.error('Error checking permissions:', error.message);
    }

    console.log('\n🎉 Step-by-step fix completed!');
    console.log('🔧 The social_proof_metrics table should now be accessible via the Supabase API.');

  } catch (error) {
    console.error('💥 Database connection error:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Execute the function
stepByStepFix().catch(console.error);