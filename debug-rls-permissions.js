import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugRLSPermissions() {
  console.log('🔍 Debugging RLS Permissions...\n');
  
  try {
    // Check current policies
    console.log('1. Checking current policies...');
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql: `SELECT tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;`
    });
    
    if (policiesError) {
      console.error('Error checking policies:', policiesError.message);
    } else if (policies && policies.length > 0) {
      let currentTable = '';
      policies.forEach(policy => {
        if (policy.tablename !== currentTable) {
          currentTable = policy.tablename;
          console.log(`\n📋 ${policy.tablename}:`);
        }
        console.log(`  • ${policy.policyname} (${policy.cmd})`);
        console.log(`    Permissive: ${policy.permissive}`);
        console.log(`    Roles: ${policy.roles}`);
        if (policy.qual) {
          console.log(`    USING: ${policy.qual}`);
        }
      });
    } else {
      console.log('❌ No policies found!');
    }
    
    // Check table permissions for anon role
    console.log('\n2. Checking anon role permissions...');
    const { data: anonPerms, error: anonError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          table_name,
          privilege_type
        FROM information_schema.table_privileges 
        WHERE grantee = 'anon' 
          AND table_schema = 'public'
          AND table_name IN ('profiles', 'connections', 'user_education', 'events')
        ORDER BY table_name, privilege_type;
      `
    });
    
    if (anonError) {
      console.error('Error checking anon permissions:', anonError.message);
    } else if (anonPerms && anonPerms.length > 0) {
      console.log('Anon role permissions:');
      anonPerms.forEach(perm => {
        console.log(`  ${perm.table_name}: ${perm.privilege_type}`);
      });
    } else {
      console.log('✅ No explicit permissions for anon role');
    }
    
    // Check authenticated role permissions
    console.log('\n3. Checking authenticated role permissions...');
    const { data: authPerms, error: authError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          table_name,
          privilege_type
        FROM information_schema.table_privileges 
        WHERE grantee = 'authenticated' 
          AND table_schema = 'public'
          AND table_name IN ('profiles', 'connections', 'user_education', 'events')
        ORDER BY table_name, privilege_type;
      `
    });
    
    if (authError) {
      console.error('Error checking authenticated permissions:', authError.message);
    } else if (authPerms && authPerms.length > 0) {
      console.log('Authenticated role permissions:');
      authPerms.forEach(perm => {
        console.log(`  ${perm.table_name}: ${perm.privilege_type}`);
      });
    } else {
      console.log('❌ No permissions for authenticated role');
    }
    
    // Check RLS status again
    console.log('\n4. Double-checking RLS status...');
    const { data: rlsCheck, error: rlsCheckError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname, 
          tablename, 
          pc.relrowsecurity as rls_enabled,
          pc.relforcerowsecurity as rls_forced
        FROM pg_tables pt
        JOIN pg_class pc ON pc.relname = pt.tablename
        WHERE schemaname = 'public' 
          AND pt.tablename IN ('profiles', 'connections', 'user_education', 'events')
        ORDER BY tablename;
      `
    });
    
    if (rlsCheckError) {
      console.error('Error checking RLS:', rlsCheckError.message);
    } else if (rlsCheck) {
      console.log('RLS Status:');
      rlsCheck.forEach(table => {
        console.log(`  ${table.tablename}: enabled=${table.rls_enabled}, forced=${table.rls_forced}`);
      });
    }
    
    console.log('\n🎉 RLS permissions debug completed!');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

debugRLSPermissions();